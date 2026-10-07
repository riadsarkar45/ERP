import { Request, Response } from "express";
import fs from "fs";
import ExcelJS from "exceljs";
import prisma from "../../database/prismaClient/prisma";

/* ------------------------------------------------------------------ */
/* CONFIG                                                              */
/* ------------------------------------------------------------------ */
const QTY_TOLERANCE = 0.01;
const MAX_ROWS = 50000;
const HEADER_SCAN_LIMIT = 10;

const DELIVERY_TYPE_TO_BUCKET: Record<string, "yarnDelivery" | "yarnReturn" | "greyReceived"> = {
    yarndelivery: "yarnDelivery",
    greyfabricreceived: "greyReceived",
    yarnreturn: "yarnReturn",
    greyreceived: "greyReceived",
};

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type Bucket = "yarnDelivery" | "yarnReturn" | "greyReceived";
type Qty = Record<Bucket, number>;
type Status = "MATCHED" | "QTY_MISMATCH" | "MISSING_IN_SYSTEM";

const BUCKETS: Bucket[] = ["yarnDelivery", "yarnReturn", "greyReceived"];

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
}

interface Group {
    challanKey: string;
    factoryKey: string;
    challanNo: string;
    factoryName: string;
    months: Set<string>;
    qty: Qty;
    firstRow: number;
    repeatedCount: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const normalizeHeader = (s: string): string => 
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeChallan = (v: unknown): string =>
    String(v ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/^0+(?=\d)/, "");

const normalizeFactory = (s: string): string =>
    s.toLowerCase().trim().replace(/\s+/g, " ");

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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toMonthText = (v: ExcelJS.CellValue): string => {
    const p = cellToPrimitive(v);
    if (p instanceof Date) {
        return `${MONTH_NAMES[p.getUTCMonth()]} ${p.getUTCFullYear()}`;
    }
    if (p === null) return "";
    const str = String(p).trim();
    const dateMatch = str.match(/(\d{1,2})[-/](\w{3})[-/](\d{2,4})/);
    if (dateMatch) {
        const day = parseInt(dateMatch[1]!);
        const monthStr = dateMatch[2]!;
        const year = parseInt(dateMatch[3]!);
        const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
        const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
        if (monthIdx !== -1) {
            return `${MONTH_NAMES[monthIdx]} ${fullYear}`;
        }
    }
    return str;
};

const factoryMatches = (excelFactoryKey: string, fromFactory: string | null, toFactory: string | null): boolean => {
    if (!excelFactoryKey) return false;
    const excelKey = normalizeFactory(excelFactoryKey);
    const dbFromFactory = normalizeFactory(fromFactory || "");
    const dbToFactory = normalizeFactory(toFactory || "");
    return dbFromFactory === excelKey || dbToFactory === excelKey;
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

            if (!headerRow) {
                const rowText = values.map((v: ExcelJS.CellValue) => cellToText(v).toLowerCase()).join(" ");
                if (rowText.includes("challan") && (rowText.includes("delivery") || rowText.includes("fabric") || rowText.includes("return"))) {
                    headerRow = row;
                    
                    values.forEach((v: ExcelJS.CellValue, idx: number) => {
                        if (idx === 0) return;
                        const text = normalizeHeader(cellToText(v));
                        
                        // Detect all relevant columns
                        if (text.includes("yarndeliverychallanno") || text === "yarndeliverychallan") {
                            colIndices.yarnDeliveryChallan = idx;
                        } else if (text.includes("yarndeliveryqty")) {
                            colIndices.yarnDeliveryQty = idx;
                        } else if (text.includes("yarnreturnqty") || text === "yarnreturn") {
                            colIndices.yarnReturnQty = idx; // FIX: Detect Yarn Return column
                        } else if (text.includes("fabricreceivedchallan")) {
                            colIndices.greyReceivedChallan = idx;
                        } else if (text.includes("greyfabricreceived")) {
                            colIndices.greyReceivedQty = idx;
                        } else if (text === "knittingfactory") {
                            colIndices.knittingFactory = idx;
                        } else if (text === "date" && !colIndices.date) {
                            colIndices.date = idx;
                        }
                    });
                }
                continue;
            }

            if (!headerRow || Object.keys(colIndices).length === 0) continue;
            
            const yarnChallanIdx = colIndices.yarnDeliveryChallan;
            const yarnQtyIdx = colIndices.yarnDeliveryQty;
            const yarnReturnQtyIdx = colIndices.yarnReturnQty; // FIX: Added index
            const knittingFactoryIdx = colIndices.knittingFactory;
            const dateIdx = colIndices.date;
            const greyChallanIdx = colIndices.greyReceivedChallan;
            const greyQtyIdx = colIndices.greyReceivedQty;

            const factoryName = knittingFactoryIdx ? cellToText(values[knittingFactoryIdx]) : "";
            const month = dateIdx ? toMonthText(values[dateIdx]) : "";

            // Process Yarn Delivery & Return
            if (yarnChallanIdx && yarnQtyIdx && factoryName) {
                const yarnChallanNo = cellToText(values[yarnChallanIdx]);
                const yarnQty = yarnQtyIdx ? toQty(values[yarnQtyIdx]) : 0;
                const yarnReturnQtyFromCol = yarnReturnQtyIdx ? Math.abs(toQty(values[yarnReturnQtyIdx])) : 0;
                
                // 1. If there is a specific Yarn Return Qty column value > 0
                if (yarnChallanNo && yarnReturnQtyFromCol > 0 && !/^total|sum|up to date|sgs/i.test(yarnChallanNo)) {
                    rows.push({
                        rowNumber: row.number,
                        challanNo: yarnChallanNo,
                        factoryName,
                        month,
                        qty: { yarnDelivery: 0, yarnReturn: yarnReturnQtyFromCol, greyReceived: 0 },
                        bucket: "yarnReturn",
                    });
                } 
                // 2. If Yarn Delivery Qty is negative, treat it as a return
                else if (yarnChallanNo && yarnQty < 0 && !/^total|sum|up to date|sgs/i.test(yarnChallanNo)) {
                    rows.push({
                        rowNumber: row.number,
                        challanNo: yarnChallanNo,
                        factoryName,
                        month,
                        qty: { yarnDelivery: 0, yarnReturn: Math.abs(yarnQty), greyReceived: 0 },
                        bucket: "yarnReturn",
                    });
                }
                // 3. Normal positive delivery
                else if (yarnChallanNo && yarnQty > 0 && !/^total|sum|up to date|sgs/i.test(yarnChallanNo)) {
                    rows.push({
                        rowNumber: row.number,
                        challanNo: yarnChallanNo,
                        factoryName,
                        month,
                        qty: { yarnDelivery: yarnQty, yarnReturn: 0, greyReceived: 0 },
                        bucket: "yarnDelivery",
                    });
                }
            }

            // Process Grey Fabric Received
            if (greyChallanIdx && greyQtyIdx && factoryName) {
                const greyChallanNo = cellToText(values[greyChallanIdx]);
                const greyQty = greyQtyIdx ? toQty(values[greyQtyIdx]) : 0;
                
                if (greyChallanNo && greyQty > 0 && !/^total|sum|up to date|sgs/i.test(greyChallanNo)) {
                    rows.push({
                        rowNumber: row.number,
                        challanNo: greyChallanNo,
                        factoryName,
                        month,
                        qty: { yarnDelivery: 0, yarnReturn: 0, greyReceived: greyQty },
                        bucket: "greyReceived",
                    });
                }
            }

            if (rows.length > MAX_ROWS) {
                throw new Error(`File has more than ${MAX_ROWS} rows.`);
            }
        }

        if (headerRow) sheetsRead++;
    }

    return { rows, sheetsRead };
};

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* ------------------------------------------------------------------ */
export const factoryStockComparison = async (req: Request, res: Response) => {
    const filePath = req.file?.path;

    try {
        if (!filePath) {
            return res.status(400).json({ success: false, message: "Please upload an Excel (.xlsx) file." });
        }

        const { rows, sheetsRead } = await parseExcel(filePath);

        if (sheetsRead === 0) {
            return res.status(422).json({ success: false, message: "Could not find the header row." });
        }
        if (rows.length === 0) {
            return res.status(422).json({ success: false, message: "No challan rows found in the file." });
        }

        const excelFactories = Array.from(new Set(rows.map(r => normalizeFactory(r.factoryName))));

        const groups = new Map<string, Group>();
        for (const r of rows) {
            const challanKey = normalizeChallan(r.challanNo);
            const factoryKey = normalizeFactory(r.factoryName);
            const gKey = `${challanKey}|${factoryKey}`;
            
            let g = groups.get(gKey);
            if (!g) {
                g = {
                    challanKey,
                    factoryKey,
                    challanNo: r.challanNo,
                    factoryName: r.factoryName,
                    months: new Set<string>(),
                    qty: emptyQty(),
                    firstRow: r.rowNumber,
                    repeatedCount: 0,
                };
                groups.set(gKey, g);
            }
            
            if (r.bucket === "yarnDelivery") g.qty.yarnDelivery += r.qty.yarnDelivery;
            else if (r.bucket === "yarnReturn") g.qty.yarnReturn += r.qty.yarnReturn;
            else if (r.bucket === "greyReceived") g.qty.greyReceived += r.qty.greyReceived;
            
            if (r.month) g.months.add(r.month);
            g.repeatedCount += 1;
        }

        const allChallanKeys = Array.from(new Set(Array.from(groups.values()).map(g => g.challanNo.trim())));
        const numericChallans = allChallanKeys.map(n => Number(n)).filter(n => !Number.isNaN(n) && n > 0);

        const dbDeliveries = numericChallans.length > 0 
            ? await prisma.deliveries.findMany({
                where: { 
                    challanNo: { in: numericChallans },
                    composition: { workOrder: { orderType: "knittingOrder" } }
                },
                select: {
                    challanNo: true,
                    fromFactory: true,
                    toFactory: true,
                    deliveryQty: true,
                    deliveryType: true,
                    deliveryMonth: true,
                },
              })
            : [];

        const dbMap = new Map<number, DbDelivery[]>();
        for (const d of dbDeliveries) {
            let list = dbMap.get(d.challanNo);
            if (!list) { list = []; dbMap.set(d.challanNo, list); }
            list.push(d);
        }

        const results = Array.from(groups.values()).map((g) => {
            const challanNum = Number(g.challanNo.trim());
            const isNumeric = !Number.isNaN(challanNum) && challanNum > 0;
            const allDbDeliveries = isNumeric ? (dbMap.get(challanNum) || []) : [];
            
            const factorySpecificDeliveries = allDbDeliveries.filter(d => factoryMatches(g.factoryKey, d.fromFactory, d.toFactory));

            const excelQty: Qty = {
                yarnDelivery: round2(g.qty.yarnDelivery),
                yarnReturn: round2(g.qty.yarnReturn),
                greyReceived: round2(g.qty.greyReceived),
            };

            let status: Status;
            let systemQty: Qty | null = null;
            let diff: Qty | null = null;
            const mismatchFields: Bucket[] = [];
            let factoryMismatch = false;

            if (factorySpecificDeliveries.length === 0) {
                if (allDbDeliveries.length > 0) factoryMismatch = true;
                status = "MISSING_IN_SYSTEM";
            } else {
                const sys = emptyQty();
                for (const d of factorySpecificDeliveries) {
                    const bucket = DELIVERY_TYPE_TO_BUCKET[normalizeHeader(d.deliveryType || "")];
                    if (bucket) sys[bucket] += Number(d.deliveryQty || 0);
                }
                
                systemQty = {
                    yarnDelivery: round2(sys.yarnDelivery),
                    yarnReturn: round2(sys.yarnReturn),
                    greyReceived: round2(sys.greyReceived),
                };
                
                diff = {
                    yarnDelivery: round2(excelQty.yarnDelivery - systemQty.yarnDelivery),
                    yarnReturn: round2(excelQty.yarnReturn - systemQty.yarnReturn),
                    greyReceived: round2(excelQty.greyReceived - systemQty.greyReceived),
                };
                
                BUCKETS.forEach((b) => {
                    if (Math.abs(diff![b]) > QTY_TOLERANCE) mismatchFields.push(b);
                });
                
                status = mismatchFields.length ? "QTY_MISMATCH" : "MATCHED";
            }

            const firstDelivery = factorySpecificDeliveries[0] || allDbDeliveries[0];
            const dbMonths = new Set<string>();
            factorySpecificDeliveries.forEach(d => {
                if (d.deliveryMonth && d.deliveryMonth !== "N/A") dbMonths.add(d.deliveryMonth);
            });
            
            const finalMonth = dbMonths.size > 0 ? Array.from(dbMonths).join(", ") : (Array.from(g.months).join(", ") || "N/A");

            return {
                challanNo: g.challanNo,
                factoryName: g.factoryName || "N/A",
                month: finalMonth,
                fromFactory: firstDelivery?.fromFactory || "N/A",
                toFactory: firstDelivery?.toFactory || "N/A",
                excelRow: g.firstRow,
                repeatedCount: g.repeatedCount,
                status,
                factoryMismatch,
                excelQty,
                systemQty,
                diff,
                mismatchFields,
            };
        });

        const order: Record<Status, number> = { MISSING_IN_SYSTEM: 0, QTY_MISMATCH: 1, MATCHED: 2 };
        results.sort((a, b) => order[a.status] - order[b.status] || a.challanNo.localeCompare(b.challanNo));

        const summary = {
            excelRowsRead: rows.length,
            totalChallans: results.length,
            matched: results.filter((r) => r.status === "MATCHED").length,
            qtyMismatch: results.filter((r) => r.status === "QTY_MISMATCH").length,
            missingInSystem: results.filter((r) => r.status === "MISSING_IN_SYSTEM").length,
            factoryMismatch: results.filter((r) => r.factoryMismatch).length,
            sheetsRead,
            factories: excelFactories.join(", "),
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