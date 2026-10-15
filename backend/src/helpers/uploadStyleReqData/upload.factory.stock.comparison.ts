import { Request, Response } from "express";
import fs from "fs";
import ExcelJS from "exceljs";
import prisma from "../../database/prismaClient/prisma";

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */
const QTY_TOLERANCE = 0.01;
const MAX_ROWS = 50000;
const HEADER_SCAN_LIMIT = 50;

const DELIVERY_TYPE_TO_BUCKET: Record<string, "yarnDelivery" | "yarnReturn" | "greyReceived"> = {
    "YARN DELIVERY": "yarnDelivery",
    "GREY FABRIC RECEIVED": "greyReceived",
    "YARN RETURN": "yarnReturn",
    "GREY RECEIVED": "greyReceived",
    yarndelivery: "yarnDelivery",
    greyfabricreceived: "greyReceived",
    yarnreturn: "yarnReturn",
    greyreceived: "greyReceived",
};

type Bucket = "yarnDelivery" | "yarnReturn" | "greyReceived";
type Qty = Record<Bucket, number>;
type Status = "MATCHED" | "QTY_MISMATCH" | "MISSING_IN_SYSTEM" | "MISSING_IN_EXCEL" | "FACTORY_MISMATCH";

const BUCKETS: Bucket[] = ["yarnDelivery", "yarnReturn", "greyReceived"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
interface ExcelRow {
    rowNumber: number;
    challanNo: string;
    factoryName: string;
    month: string;
    qty: Qty;
    bucket: Bucket;
}

interface DbDelivery {
    challanNo: number;
    fromFactory: string | null;
    toFactory: string | null;
    deliveryQty: unknown;
    deliveryType: string | null;
    deliveryMonth: string | null;
    deliveryDate: Date | null;
}

interface Group {
    challanKey: string;
    factoryKey: string;
    monthKey: string; // Added for multi-month accuracy
    challanNo: string;
    factoryName: string;
    month: string;
    qty: Qty;
    firstRow: number;
    repeatedCount: number;
}

interface ReconciliationEntry {
    challanNo: string;
    factoryName: string;
    month: string;
    fromFactory: string;
    toFactory: string;
    status: Status;
    excelQty: Qty | null;
    dbQty: Qty | null;
    diff: Qty | null;
    mismatchFields: Bucket[];
    repeatedCount: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const normalizeHeader = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeFactory = (s: string): string => s.toLowerCase().trim().replace(/\s+/g, " ");
const round2 = (n: number): number => Math.round(n * 100) / 100;
const emptyQty = (): Qty => ({ yarnDelivery: 0, yarnReturn: 0, greyReceived: 0 });

const cellToPrimitive = (v: ExcelJS.CellValue): string | number | Date | null => {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v;
    if (typeof v === "number" || typeof v === "string") return v;
    if (typeof v === "boolean") return String(v);
    if (typeof v === "object") {
        const o = v as any;
        if ("result" in o) return cellToPrimitive(o.result);
        if (Array.isArray(o.richText)) return o.richText.map((t: any) => t.text).join("");
        if ("text" in o) return String(o.text);
    }
    return null;
};

const cellToText = (v: ExcelJS.CellValue): string => {
    const p = cellToPrimitive(v);
    if (p === null) return "";
    if (p instanceof Date) return p.toISOString();
    return String(p).trim();
};

const toQty = (v: ExcelJS.CellValue): number => {
    const p = cellToPrimitive(v);
    if (typeof p === "number") return Number.isFinite(p) ? p : 0;
    if (typeof p === "string") {
        const n = parseFloat(p.replace(/,/g, "").trim());
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
};

const toMonthText = (v: ExcelJS.CellValue): string => {
    const p = cellToPrimitive(v);
    if (p instanceof Date) return `${MONTH_NAMES[p.getUTCMonth()]} ${p.getUTCFullYear()}`;
    if (p === null) return "";
    const str = String(p).trim();

    let m = str.match(/(\d{1,2})[-/.](\w{3,9}|\d{1,2})[-/.](\d{2,4})/);
    if (m) {
        const part2 = m[2]!;
        const year = parseInt(m[3]!);
        const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
        const monthIdx = MONTH_NAMES.findIndex(x => x.toLowerCase() === part2.toLowerCase().substring(0, 3));
        if (monthIdx !== -1) return `${MONTH_NAMES[monthIdx]} ${fullYear}`;
        const numMonth = parseInt(part2);
        if (!isNaN(numMonth) && numMonth >= 1 && numMonth <= 12) return `${MONTH_NAMES[numMonth - 1]} ${fullYear}`;
    }

    m = str.match(/(\w{3,9}|\d{1,2})[-/. ](\d{2,4})/);
    if (m) {
        const part1 = m[1]!;
        const year = parseInt(m[2]!);
        const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
        const monthIdx = MONTH_NAMES.findIndex(x => x.toLowerCase() === part1.toLowerCase().substring(0, 3));
        if (monthIdx !== -1) return `${MONTH_NAMES[monthIdx]} ${fullYear}`;
    }

    for (let i = 0; i < MONTH_NAMES.length; i++) {
        if (str.toLowerCase().includes(MONTH_NAMES[i]!.toLowerCase())) {
            const yearMatch = str.match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1]!) : new Date().getFullYear();
            return `${MONTH_NAMES[i]} ${year}`;
        }
    }
    return "";
};

const standardizeMonth = (monthStr: string, defaultYear?: number): string | null => {
    if (!monthStr) return null;
    const str = String(monthStr).trim();

    let year = defaultYear || new Date().getFullYear();
    const year4Match = str.match(/\b(19|20)\d{2}\b/);
    if (year4Match) year = parseInt(year4Match[0]);
    else {
        const endYearMatch = str.match(/[-/. ](\d{2})$/);
        if (endYearMatch) {
            const y = parseInt(endYearMatch[1]!);
            year = y < 50 ? 2000 + y : 1900 + y;
        }
    }

    let monthIndex = -1;
    for (let i = 0; i < MONTH_NAMES.length; i++) {
        if (str.toLowerCase().includes(MONTH_NAMES[i]!.toLowerCase())) {
            monthIndex = i;
            break;
        }
    }
    if (monthIndex !== -1) return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    const numericMonthMatch = str.match(/^(0?[1-9]|1[0-2])[-/.](\d{2,4})$/);
    if (numericMonthMatch) {
        const m = parseInt(numericMonthMatch[1]!);
        const y = parseInt(numericMonthMatch[2]!);
        const fullYear = y < 100 ? (y < 50 ? 2000 + y : 1900 + y) : y;
        return `${fullYear}-${String(m).padStart(2, '0')}`;
    }
    return null;
};

const factoryMatches = (excelFactoryKey: string, fromFactory: string | null, toFactory: string | null): boolean => {
    if (!excelFactoryKey) return false;
    const excelKey = normalizeFactory(excelFactoryKey);
    const dbFromFactory = normalizeFactory(fromFactory || "");
    const dbToFactory = normalizeFactory(toFactory || "");
    return dbFromFactory === excelKey || dbToFactory === excelKey;
};

const isValidFactoryName = (name: string): boolean => {
    if (!name || name.length < 3) return false;
    const upper = name.toUpperCase();
    if (/^[A-Z]+[-/]\d+[-/]\d+$/i.test(name)) return false;
    if (/^[A-Z]+[-/]\d+$/i.test(name)) return false;
    if (upper.includes("KNIT") || upper.includes("WEAR") || upper.includes("SOURCING") ||
        upper.includes("NIPA") || upper.includes("ONE PLUS") || upper.includes("SM ") ||
        upper.includes("ASR") || upper.includes("FABRIC") || upper.includes("SAKIB")) {
        return true;
    }
    return !/[-/]/.test(name);
};

const getBucket = (deliveryType: string | null): Bucket | undefined => {
    if (!deliveryType) return undefined;
    if (DELIVERY_TYPE_TO_BUCKET[deliveryType]) return DELIVERY_TYPE_TO_BUCKET[deliveryType];
    return DELIVERY_TYPE_TO_BUCKET[normalizeHeader(deliveryType)];
};

/* ------------------------------------------------------------------ */
/* Excel parsing                                                       */
/* ------------------------------------------------------------------ */
const parseExcel = async (filePath: string) => {
    const rows: ExcelRow[] = [];
    let sheetsRead = 0;

    const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
        worksheets: "emit",
        sharedStrings: "cache",
        hyperlinks: "ignore",
        styles: "cache",
    });

    for await (const sheet of reader) {
        let headerRow: ExcelJS.Row | null = null;
        let colIndices: Record<string, number> = {};

        for await (const row of sheet) {
            const values = row.values as ExcelJS.CellValue[];
            const firstCellText = cellToText(values[1] || values[0]).toUpperCase();
            if (firstCellText.startsWith("B/L") || firstCellText.startsWith("BALANCE") ||
                firstCellText.startsWith("SUM OF") || firstCellText.startsWith("GRAND TOTAL")) {
                break;
            }

            if (!headerRow) {
                const rowText = values.map((v: ExcelJS.CellValue) => cellToText(v).toLowerCase()).join(" ");
                if (rowText.includes("challan") && (rowText.includes("delivery") || rowText.includes("fabric"))) {
                    headerRow = row;
                    values.forEach((v: ExcelJS.CellValue, idx: number) => {
                        if (idx === 0) return;
                        const text = normalizeHeader(cellToText(v));
                        if (text.includes("yarndeliverychallanno") || text === "yarndeliverychallan") colIndices.yarnDeliveryChallan = idx;
                        else if (text.includes("yarndeliveryqty")) colIndices.yarnDeliveryQty = idx;
                        else if (text.includes("yarnreturnqty") || text === "yarnreturn") colIndices.yarnReturnQty = idx;
                        else if (text.includes("fabricreceivedchallan")) colIndices.greyReceivedChallan = idx;
                        else if (text.includes("greyfabricreceived")) colIndices.greyReceivedQty = idx;
                        else if (text === "knittingfactory" || text === "smchallan") colIndices.factory = idx;
                        else if (text === "date") {
                            if (!colIndices.yarnDate) colIndices.yarnDate = idx;
                            else if (!colIndices.greyDate) colIndices.greyDate = idx;
                        }
                    });
                }
                continue;
            }

            if (!headerRow || Object.keys(colIndices).length === 0) continue;

            const yarnChallanIdx = colIndices.yarnDeliveryChallan;
            const yarnQtyIdx = colIndices.yarnDeliveryQty;
            const yarnReturnQtyIdx = colIndices.yarnReturnQty;
            const factoryIdx = colIndices.factory;
            const yarnDateIdx = colIndices.yarnDate;
            const greyDateIdx = colIndices.greyDate;
            const greyChallanIdx = colIndices.greyReceivedChallan;
            const greyQtyIdx = colIndices.greyReceivedQty;

            const rawFactoryName = factoryIdx ? cellToText(values[factoryIdx]) : "";
            if (!isValidFactoryName(rawFactoryName)) continue;

            const factoryName = rawFactoryName;
            const yarnMonth = yarnDateIdx ? toMonthText(values[yarnDateIdx]) : "";
            const greyMonth = greyDateIdx ? toMonthText(values[greyDateIdx]) : "";

            if (yarnChallanIdx && yarnQtyIdx) {
                const yarnChallanNo = cellToText(values[yarnChallanIdx]);
                const yarnQty = yarnQtyIdx ? toQty(values[yarnQtyIdx]) : 0;
                const yarnReturnQtyFromCol = yarnReturnQtyIdx ? Math.abs(toQty(values[yarnReturnQtyIdx])) : 0;

                if (yarnChallanNo && yarnReturnQtyFromCol > 0 && !/^total|sum|up to date|sgs|b\/l/i.test(yarnChallanNo)) {
                    rows.push({ rowNumber: row.number, challanNo: yarnChallanNo, factoryName, month: yarnMonth, qty: { yarnDelivery: 0, yarnReturn: yarnReturnQtyFromCol, greyReceived: 0 }, bucket: "yarnReturn" });
                } else if (yarnChallanNo && yarnQty < 0 && !/^total|sum|up to date|sgs|b\/l/i.test(yarnChallanNo)) {
                    rows.push({ rowNumber: row.number, challanNo: yarnChallanNo, factoryName, month: yarnMonth, qty: { yarnDelivery: 0, yarnReturn: Math.abs(yarnQty), greyReceived: 0 }, bucket: "yarnReturn" });
                } else if (yarnChallanNo && yarnQty > 0 && !/^total|sum|up to date|sgs|b\/l/i.test(yarnChallanNo)) {
                    rows.push({ rowNumber: row.number, challanNo: yarnChallanNo, factoryName, month: yarnMonth, qty: { yarnDelivery: yarnQty, yarnReturn: 0, greyReceived: 0 }, bucket: "yarnDelivery" });
                }
            }

            if (greyChallanIdx && greyQtyIdx) {
                const greyChallanNo = cellToText(values[greyChallanIdx]);
                const greyQty = greyQtyIdx ? toQty(values[greyQtyIdx]) : 0;
                if (greyChallanNo && greyQty > 0 && !/^total|sum|up to date|sgs|b\/l/i.test(greyChallanNo)) {
                    rows.push({ rowNumber: row.number, challanNo: greyChallanNo, factoryName, month: greyMonth, qty: { yarnDelivery: 0, yarnReturn: 0, greyReceived: greyQty }, bucket: "greyReceived" });
                }
            }

            if (rows.length > MAX_ROWS) throw new Error(`File has more than ${MAX_ROWS} rows.`);
        }
        if (headerRow) sheetsRead++;
    }
    return { rows, sheetsRead };
};

/* ------------------------------------------------------------------ */
/* Get Available Months                                                */
/* ------------------------------------------------------------------ */
export const getAvailableMonths = async (_req: Request, res: Response) => {
    try {
        const months = await prisma.deliveries.findMany({
            where: {
                composition: { workOrder: { orderType: "knittingOrder" } },
                deliveryMonth: { not: "N/A" }
            },
            select: { deliveryMonth: true },
            distinct: ["deliveryMonth"],
        });
        const sorted = months.map(m => m.deliveryMonth).filter((m): m is string => !!m).sort();
        return res.status(200).json({ success: true, months: sorted });
    } catch (error) {
        console.error("getAvailableMonths error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch months." });
    }
};

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */
export const factoryStockComparison = async (req: Request, res: Response) => {
    const filePath = req.file?.path;

    try {
        if (!filePath) return res.status(400).json({ success: false, message: "Please upload an Excel file." });

        // FIX: Safely parse months array from Multer text field
        const rawMonths = req.body?.months as string | undefined;
        let selectedMonths: string[] = [];
        try {
            selectedMonths = rawMonths ? JSON.parse(rawMonths) : [];
        } catch {
            selectedMonths = [];
        }

        if (!Array.isArray(selectedMonths) || selectedMonths.length === 0) {
            return res.status(400).json({ success: false, message: "Please select at least one month to compare." });
        }

        const { rows, sheetsRead } = await parseExcel(filePath);
        if (sheetsRead === 0) return res.status(422).json({ success: false, message: "Could not find the header row." });
        if (rows.length === 0) return res.status(422).json({ success: false, message: "No challan rows found in the file." });

        // Infer year from Excel
        const excelYears = new Set<number>();
        rows.forEach(r => {
            const key = standardizeMonth(r.month);
            if (key) excelYears.add(parseInt(key.split('-')[0]!));
        });
        const fileYear = excelYears.size === 1 ? Array.from(excelYears)[0] : new Date().getFullYear();

        // Standardize selected months
        const targetMonthKeys = selectedMonths
            .map(m => standardizeMonth(m, fileYear))
            .filter((m): m is string => m !== null);

        if (targetMonthKeys.length === 0) {
            return res.status(422).json({ success: false, message: "Invalid month format selected." });
        }

        // Filter Excel rows
        const filteredExcelRows = rows.filter(r => {
            const rowMonthKey = standardizeMonth(r.month, fileYear);
            return rowMonthKey !== null && targetMonthKeys.includes(rowMonthKey);
        });

        if (filteredExcelRows.length === 0) {
            const availableMonths = [...new Set(rows.map(r => r.month).filter(Boolean))].join(", ");
            return res.status(422).json({
                success: false,
                message: `No data found in Excel for selected months. Available months in file: ${availableMonths || "none"}`,
            });
        }

        const excelFactories = Array.from(new Set(filteredExcelRows.map(r => normalizeFactory(r.factoryName))));

        // Group Excel Data (FIX: Added monthKey to prevent merging same challans across different months)
        const excelGroups = new Map<string, Group>();
        for (const r of filteredExcelRows) {
            const challanKey = String(r.challanNo).trim().toUpperCase().replace(/\s+/g, "").replace(/^0+(?=\d)/, "");
            const factoryKey = normalizeFactory(r.factoryName);
            const monthKey = standardizeMonth(r.month, fileYear) || "UNKNOWN";
            const gKey = `${challanKey}|${factoryKey}|${monthKey}`;
            
            let g = excelGroups.get(gKey);
            if (!g) {
                g = { challanKey, factoryKey, monthKey, challanNo: r.challanNo, factoryName: r.factoryName, month: r.month, qty: emptyQty(), firstRow: r.rowNumber, repeatedCount: 0 };
                excelGroups.set(gKey, g);
            }
            if (r.bucket === "yarnDelivery") g.qty.yarnDelivery += r.qty.yarnDelivery;
            else if (r.bucket === "yarnReturn") g.qty.yarnReturn += r.qty.yarnReturn;
            else if (r.bucket === "greyReceived") g.qty.greyReceived += r.qty.greyReceived;
            g.repeatedCount += 1;
        }

        // Fetch DB Deliveries for ALL selected months
        const dbDeliveries = await prisma.deliveries.findMany({
            where: {
                composition: { workOrder: { orderType: "knittingOrder" } },
                deliveryMonth: { in: selectedMonths },
            },
            select: {
                challanNo: true, fromFactory: true, toFactory: true,
                deliveryQty: true, deliveryType: true, deliveryMonth: true,
            },
        });

        const dbChallanIndex = new Map<number, typeof dbDeliveries>();
        for (const d of dbDeliveries) {
            const cNo = Number(d.challanNo);
            if (!Number.isNaN(cNo)) {
                if (!dbChallanIndex.has(cNo)) dbChallanIndex.set(cNo, []);
                dbChallanIndex.get(cNo)!.push(d);
            }
        }

        // Group DB Data
        const dbGroups = new Map<string, Group>();
        for (const d of dbDeliveries) {
            const matchingFactory = excelFactories.find(f => factoryMatches(f, d.fromFactory, d.toFactory));
            if (!matchingFactory) continue;

            const challanKey = String(d.challanNo).trim().toUpperCase().replace(/\s+/g, "").replace(/^0+(?=\d)/, "");
            const factoryKey = normalizeFactory(matchingFactory);
            const monthKey = standardizeMonth(d.deliveryMonth || "", fileYear) || "UNKNOWN";
            const gKey = `${challanKey}|${factoryKey}|${monthKey}`;

            let g = dbGroups.get(gKey);
            if (!g) {
                g = { challanKey, factoryKey, monthKey, challanNo: String(d.challanNo), factoryName: matchingFactory, month: d.deliveryMonth || "", qty: emptyQty(), firstRow: 0, repeatedCount: 0 };
                dbGroups.set(gKey, g);
            }
            const bucket = getBucket(d.deliveryType);
            if (bucket) g.qty[bucket] += Number(d.deliveryQty || 0);
            g.repeatedCount += 1;
        }

        // Full Outer Join Reconciliation
        const results: ReconciliationEntry[] = [];
        const processedKeys = new Set<string>();

        for (const [key, group] of excelGroups.entries()) {
            processedKeys.add(key);
            const challanNum = Number(String(group.challanNo).trim());
            const dbRecordsForChallan = (!Number.isNaN(challanNum)) ? dbChallanIndex.get(challanNum) : null;

            let isFactoryMismatch = false;
            if (dbRecordsForChallan && dbRecordsForChallan.length > 0) {
                const hasOtherFactory = dbRecordsForChallan.some(d => {
                    const match = excelFactories.find(f => factoryMatches(f, d.fromFactory, d.toFactory));
                    return !match;
                });
                if (hasOtherFactory) isFactoryMismatch = true;
            }

            const excelQty: Qty = {
                yarnDelivery: round2(group.qty.yarnDelivery),
                yarnReturn: round2(group.qty.yarnReturn),
                greyReceived: round2(group.qty.greyReceived),
            };

            const dbGroup = dbGroups.get(key);
            let dbQty: Qty | null = null;
            let diff: Qty | null = null;
            let status: Status;
            const mismatchFields: Bucket[] = [];

            if (dbGroup) {
                dbQty = {
                    yarnDelivery: round2(dbGroup.qty.yarnDelivery),
                    yarnReturn: round2(dbGroup.qty.yarnReturn),
                    greyReceived: round2(dbGroup.qty.greyReceived),
                };
                diff = {
                    yarnDelivery: round2(excelQty.yarnDelivery - dbQty.yarnDelivery),
                    yarnReturn: round2(excelQty.yarnReturn - dbQty.yarnReturn),
                    greyReceived: round2(excelQty.greyReceived - dbQty.greyReceived),
                };
                BUCKETS.forEach(b => { if (Math.abs(diff![b]) > QTY_TOLERANCE) mismatchFields.push(b); });
                status = mismatchFields.length ? "QTY_MISMATCH" : "MATCHED";
            } else {
                status = isFactoryMismatch ? "FACTORY_MISMATCH" : "MISSING_IN_SYSTEM";
            }

            results.push({
                challanNo: group.challanNo, factoryName: group.factoryName, month: group.month,
                fromFactory: "N/A", toFactory: "N/A",
                excelQty, dbQty, diff, status, mismatchFields, repeatedCount: group.repeatedCount,
            });
        }

        for (const [key, group] of dbGroups.entries()) {
            if (processedKeys.has(key)) continue;
            const dbQty: Qty = {
                yarnDelivery: round2(group.qty.yarnDelivery),
                yarnReturn: round2(group.qty.yarnReturn),
                greyReceived: round2(group.qty.greyReceived),
            };
            results.push({
                challanNo: group.challanNo, factoryName: group.factoryName, month: group.month,
                fromFactory: group.factoryName, toFactory: group.factoryName,
                excelQty: null, dbQty, diff: null, status: "MISSING_IN_EXCEL",
                mismatchFields: [], repeatedCount: group.repeatedCount,
            });
        }

        const order: Record<Status, number> = { MISSING_IN_SYSTEM: 0, FACTORY_MISMATCH: 1, MISSING_IN_EXCEL: 2, QTY_MISMATCH: 3, MATCHED: 4 };
        results.sort((a, b) => order[a.status] - order[b.status] || a.month.localeCompare(b.month) || a.factoryName.localeCompare(b.factoryName) || String(a.challanNo).localeCompare(String(b.challanNo)));

        const summary = {
            excelRowsRead: filteredExcelRows.length, totalChallans: results.length,
            matched: results.filter(r => r.status === "MATCHED").length,
            qtyMismatch: results.filter(r => r.status === "QTY_MISMATCH").length,
            missingInSystem: results.filter(r => r.status === "MISSING_IN_SYSTEM").length,
            factoryMismatch: results.filter(r => r.status === "FACTORY_MISMATCH").length,
            missingInExcel: results.filter(r => r.status === "MISSING_IN_EXCEL").length,
            sheetsRead, selectedMonths: selectedMonths.join(", "), factories: excelFactories.join(", "),
        };

        return res.status(200).json({ success: true, summary, results });

    } catch (error) {
        console.error("factoryStockComparison error:", error);
        const message = error instanceof Error ? error.message : "Failed to compare the file.";
        return res.status(500).json({ success: false, message });
    } finally {
        if (filePath) fs.unlink(filePath, () => undefined);
    }
};