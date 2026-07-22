import ExcelJS from "exceljs";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { uploadDataFromFile } from "../../helpers/uploadStyleReqData/uploadFileData";
import { uploadKWODataFromFile } from "../../helpers/uploadStyleReqData/uploadWorkOrder";
import { uploadAOWDataFromFile } from "../../helpers/uploadStyleReqData/uploadawoOrder";
import { uploadDYEINGDataFromFile } from "../../helpers/uploadStyleReqData/uploadDyeingOrder";

// ── Type Definitions ──────────────────────────────────────────────
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
    stream?: NodeJS.ReadableStream;
}

type MulterRequest = Request & { file?: MulterFile };

interface ParsedRow {
    salesContractNo: string;
    buyer: string;
    jobNo: string;
    poNo: string;
    style: string;
    color: string;
    composition: string;
    finishDia: string;
    orderQty: number;
    finishFabricRequired: number;
    processLoss: number;
    additional: number;
}

interface StyleReqColumnIndices {
    salesContractNo: number;
    buyer: number;
    jobNo: number;
    poNo: number;
    style: number;
    color: number;
    composition: number;
    finishDia: number;
    orderQty: number;
    finishFabricRequired: number;
    processLoss: number;
    additional: number;
}

interface KWOParsedRow {
    workOrderDate: string;
    workOrderNo: string;
    month: string;
    salesContractNo: string;
    buyer: string;
    jobNo: string;
    poNo: string;
    style: string;
    color: string;
    composition: string;
    knittingFactoryName: string;
    knittingWorkOrderQty: number;
    knittingPricePerKg: number;
}

interface AWOParsedRow {
    workOrderDate: string;
    workOrderNo: string;
    month: string;
    salesContractNo: string;
    buyer: string;
    jobNo: string;
    poNo: string;
    style: string;
    color: string;
    composition: string;
    awoFactoryName: string;
    awoWorkOrderQty: number;
    awoPricePerKg: number;
}

interface AWOColumnIndices {
    workOrderDate: number;
    workOrderNo: number;
    month: number;
    salesContractNo: number;
    buyer: number;
    jobNo: number;
    poNo: number;
    style: number;
    color: number;
    composition: number;
    awoFactoryName: number;
    awoWorkOrderQty: number;
    awoPricePerKg: number;
}

interface DWOColumnIndices {
    workOrderDate: number;
    workOrderNo: number;
    month: number;
    salesContractNo: number;
    buyer: number;
    jobNo: number;
    poNo: number;
    style: number;
    color: number;
    composition: number;
    dwoFactoryName: number;
    dwoWorkOrderQty: number;
    dwoPricePerKg: number;
}

interface DWOParsedRow {
    workOrderDate: string;
    workOrderNo: string;
    month: string;
    salesContractNo: string;
    buyer: string;
    jobNo: string;
    poNo: string;
    style: string;
    color: string;
    composition: string;
    dwoFactoryName: string;
    dwoWorkOrderQty: number;
    dwoPricePerKg: number;
}

interface KWOColumnIndices {
    workOrderDate: number;
    workOrderNo: number;
    month: number;
    salesContractNo: number;
    buyer: number;
    jobNo: number;
    poNo: number;
    style: number;
    color: number;
    composition: number;
    knittingFactoryName: number;
    knittingWorkOrderQty: number;
    knittingPricePerKg: number;
}

// ── ExcelJS Cell Value Types ─────────────────────────────────────
interface RichTextItem {
    text?: string;
}

interface ExcelCellObject {
    richText?: RichTextItem[];
    text?: string | number | boolean;
    result?: string | number | boolean;
}

// ── Helpers ───────────────────────────────────────────────────────
const getCellValue = (row: unknown[], index: number): unknown => {
    if (!Array.isArray(row) || index < 0 || index >= row.length) return null;
    return row[index];
};

const asString = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val.trim();
    if (val instanceof Date) return val.toISOString().split("T")[0] ?? "";
    if (typeof val === "object" && val !== null) {
        const obj = val as ExcelCellObject;
        if (obj.richText && Array.isArray(obj.richText)) {
            return obj.richText.map((rt) => rt.text || "").join("").trim();
        }
        if (obj.text !== undefined) return String(obj.text).trim();
        if (obj.result !== undefined) return String(obj.result).trim();
    }
    return String(val).trim();
};

const toNumber = (val: unknown): number => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return val;
    if (val instanceof Date) return 0;
    if (typeof val === "object" && val !== null) {
        const obj = val as ExcelCellObject;
        if (obj.result !== undefined) return toNumber(obj.result);
        if (obj.text !== undefined) return toNumber(obj.text);
    }
    const cleaned = String(val).replace(/,/g, "").trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
};

const findPartialCol = (headers: unknown[], keyword: string): number => {
    return headers.findIndex((h: unknown) => asString(h).toLowerCase().includes(keyword.toLowerCase()));
};

const buildMergedHeaders = (rawData: unknown[][], headerRowIndex: number): unknown[] => {
    const fieldHeaders: unknown[] = rawData[headerRowIndex] ?? [];
    const sectionHeaders: unknown[] = headerRowIndex > 0 ? rawData[headerRowIndex - 1] ?? [] : [];
    return fieldHeaders.map((cell, idx) => (asString(cell) ? cell : sectionHeaders[idx]));
};

// ── Worksheet Reader Types ────────────────────────────────────────
type WorksheetRow = {
    values: unknown[];
};

type WorksheetReader = AsyncIterable<WorksheetRow> & {
    name?: string;
};

// ── Header Scanner ────────────────────────────────────────────────
// IMPORTANT: Node's streaming worksheetReader is a Readable-backed async
// iterator. Breaking out of a `for await...of` over it calls the
// iterator's `.return()`, which DESTROYS the underlying stream. You
// cannot break mid-read and then resume iterating the same reader later
// (that's what was causing `AbortError: The operation was aborted`).
// So this function fully drains the worksheet in ONE uninterrupted pass,
// buffering every row, then locates the header row afterward. Files are
// capped at 20MB, so buffering one sheet's rows in memory is fine.
async function readAllRowsAndFindHeader(
    worksheetReader: WorksheetReader,
    keywords: string[],
    minScore: number,
    scanLimit: number
): Promise<{ allRows: unknown[][]; headerRowIndex: number }> {
    const allRows: unknown[][] = [];

    const scoreRow = (row: unknown[]): number => {
        if (!Array.isArray(row)) return 0;
        return keywords.filter((kw) => row.some((cell) => asString(cell).toLowerCase().includes(kw))).length;
    };

    // Single unbroken pass — never exit early, always drain the full stream.
    for await (const row of worksheetReader) {
        const denseRow: unknown[] = [];
        if (Array.isArray(row.values)) {
            for (let i = 1; i < row.values.length; i++) denseRow.push(row.values[i]);
        }
        allRows.push(denseRow);
    }

    // Now find the best-scoring header row, only searching within scanLimit rows.
    let headerRowIndex = -1;
    let bestScore = 0;
    const searchLimit = Math.min(scanLimit, allRows.length);
    for (let i = 0; i < searchLimit; i++) {
        const score = scoreRow(allRows[i] ?? []);
        if (score > bestScore) {
            bestScore = score;
            headerRowIndex = i;
        }
    }
    if (bestScore < minScore) headerRowIndex = -1;

    return { allRows, headerRowIndex };
}

// ── Style Requirement Sheet Parsing ───────────────────────────────
const buildStyleReqColIndex = (headers: unknown[]): StyleReqColumnIndices => ({
    salesContractNo: findPartialCol(headers, "sales contract"),
    buyer: findPartialCol(headers, "buyer"),
    jobNo: findPartialCol(headers, "job no"),
    poNo: findPartialCol(headers, "po no"),
    style: findPartialCol(headers, "style"),
    color: findPartialCol(headers, "color"),
    composition: findPartialCol(headers, "composition"),
    finishDia: findPartialCol(headers, "finish dia"),
    orderQty: findPartialCol(headers, "order qty"),
    finishFabricRequired: findPartialCol(headers, "finish fabric"),
    processLoss: findPartialCol(headers, "process loss"),
    additional: findPartialCol(headers, "additional"),
});

const parseStyleReqRow = (row: unknown[], colIndex: StyleReqColumnIndices): ParsedRow => ({
    salesContractNo: asString(getCellValue(row, colIndex.salesContractNo)),
    buyer: asString(getCellValue(row, colIndex.buyer)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    poNo: asString(getCellValue(row, colIndex.poNo)),
    style: asString(getCellValue(row, colIndex.style)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    finishDia: asString(getCellValue(row, colIndex.finishDia)),
    orderQty: toNumber(getCellValue(row, colIndex.orderQty)),
    finishFabricRequired: toNumber(getCellValue(row, colIndex.finishFabricRequired)),
    processLoss: toNumber(getCellValue(row, colIndex.processLoss)),
    additional: toNumber(getCellValue(row, colIndex.additional)),
});

const isValidStyleReqRow = (row: ParsedRow): boolean => {
    return !!(row.salesContractNo || row.jobNo || row.style || row.poNo);
};

async function processStyleReqSheet(
    worksheetReader: WorksheetReader
): Promise<{ parsedRows: ParsedRow[]; headerFound: boolean }> {
    const STYLE_REQ_KEYWORDS = ["sales contract", "buyer", "job no", "po no", "style", "color", "composition"];
    const MIN_SCORE = 4;
    const SCAN_LIMIT = 15;

    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, STYLE_REQ_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as ParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildStyleReqColIndex(headers);

    const parsedRows: ParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseStyleReqRow(allRows[i] ?? [], colIndex);
        if (isValidStyleReqRow(parsed)) parsedRows.push(parsed);
    }

    return { parsedRows, headerFound: true };
}

// ── K.W.O Specific Parsing ────────────────────────────────────────
const buildKWOColIndex = (headers: unknown[]): KWOColumnIndices => ({
    workOrderDate: findPartialCol(headers, "work order date"),
    workOrderNo: findPartialCol(headers, "work order no"),
    month: findPartialCol(headers, "month"),
    salesContractNo: findPartialCol(headers, "sales contract"),
    buyer: findPartialCol(headers, "buyer"),
    jobNo: findPartialCol(headers, "job no"),
    poNo: findPartialCol(headers, "po no"),
    style: findPartialCol(headers, "style"),
    color: findPartialCol(headers, "color"),
    composition: findPartialCol(headers, "composition"),
    knittingFactoryName: findPartialCol(headers, "knitting factory name"),
    knittingWorkOrderQty: findPartialCol(headers, "knitting work order"),
    knittingPricePerKg: findPartialCol(headers, "knitting price per kg"),
});

// ── A.W.O Specific Parsing ────────────────────────────────────────
const buildAWOColIndex = (headers: unknown[]): AWOColumnIndices => ({
    workOrderDate: findPartialCol(headers, "work order place date"),
    workOrderNo: findPartialCol(headers, "work order no"),
    month: findPartialCol(headers, "month"),
    salesContractNo: findPartialCol(headers, "sales contract"),
    buyer: findPartialCol(headers, "buyer"),
    jobNo: findPartialCol(headers, "job no"),
    poNo: findPartialCol(headers, "po no"),
    style: findPartialCol(headers, "style"),
    color: findPartialCol(headers, "color"),
    composition: findPartialCol(headers, "composition"),
    awoFactoryName: findPartialCol(headers, "aop factory name"),
    awoWorkOrderQty: findPartialCol(headers, "aop work order"),
    awoPricePerKg: findPartialCol(headers, "aop price per kg"),
});

// ── DYEING Specific Parsing ────────────────────────────────────────
const buildDWOColIndex = (headers: unknown[]): DWOColumnIndices => ({
    workOrderDate: findPartialCol(headers, "work order place date"),
    workOrderNo: findPartialCol(headers, "work order no"),
    month: findPartialCol(headers, "month"),
    salesContractNo: findPartialCol(headers, "sales contract"),
    buyer: findPartialCol(headers, "buyer"),
    jobNo: findPartialCol(headers, "job no"),
    poNo: findPartialCol(headers, "po no"),
    style: findPartialCol(headers, "style"),
    color: findPartialCol(headers, "color"),
    composition: findPartialCol(headers, "composition"),
    dwoFactoryName: findPartialCol(headers, "dyeing factory name"),
    dwoWorkOrderQty: findPartialCol(headers, "dyeing work order"),
    dwoPricePerKg: findPartialCol(headers, "dyeing price per kg"),
});

const parseDWORow = (row: unknown[], colIndex: DWOColumnIndices): DWOParsedRow => ({
    workOrderDate: asString(getCellValue(row, colIndex.workOrderDate)),
    workOrderNo: asString(getCellValue(row, colIndex.workOrderNo)),
    month: asString(getCellValue(row, colIndex.month)),
    salesContractNo: asString(getCellValue(row, colIndex.salesContractNo)),
    buyer: asString(getCellValue(row, colIndex.buyer)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    poNo: asString(getCellValue(row, colIndex.poNo)),
    style: asString(getCellValue(row, colIndex.style)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    dwoFactoryName: asString(getCellValue(row, colIndex.dwoFactoryName)),
    dwoWorkOrderQty: toNumber(getCellValue(row, colIndex.dwoWorkOrderQty)),
    dwoPricePerKg: toNumber(getCellValue(row, colIndex.dwoPricePerKg)),
});

const parseAWORow = (row: unknown[], colIndex: AWOColumnIndices): AWOParsedRow => ({
    workOrderDate: asString(getCellValue(row, colIndex.workOrderDate)),
    workOrderNo: asString(getCellValue(row, colIndex.workOrderNo)),
    month: asString(getCellValue(row, colIndex.month)),
    salesContractNo: asString(getCellValue(row, colIndex.salesContractNo)),
    buyer: asString(getCellValue(row, colIndex.buyer)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    poNo: asString(getCellValue(row, colIndex.poNo)),
    style: asString(getCellValue(row, colIndex.style)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    awoFactoryName: asString(getCellValue(row, colIndex.awoFactoryName)),
    awoWorkOrderQty: toNumber(getCellValue(row, colIndex.awoWorkOrderQty)),
    awoPricePerKg: toNumber(getCellValue(row, colIndex.awoPricePerKg)),
});

const parseKWORow = (row: unknown[], colIndex: KWOColumnIndices): KWOParsedRow => ({
    workOrderDate: asString(getCellValue(row, colIndex.workOrderDate)),
    workOrderNo: asString(getCellValue(row, colIndex.workOrderNo)),
    month: asString(getCellValue(row, colIndex.month)),
    salesContractNo: asString(getCellValue(row, colIndex.salesContractNo)),
    buyer: asString(getCellValue(row, colIndex.buyer)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    poNo: asString(getCellValue(row, colIndex.poNo)),
    style: asString(getCellValue(row, colIndex.style)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    knittingFactoryName: asString(getCellValue(row, colIndex.knittingFactoryName)),
    knittingWorkOrderQty: toNumber(getCellValue(row, colIndex.knittingWorkOrderQty)),
    knittingPricePerKg: toNumber(getCellValue(row, colIndex.knittingPricePerKg)),
});

// Row validators
const isValidKWORow = (row: KWOParsedRow): boolean => !!(row.workOrderNo || row.jobNo || row.style);
const isValidAWORow = (row: AWOParsedRow): boolean => !!(row.workOrderNo || row.jobNo || row.style);
const isValidDWORow = (row: DWOParsedRow): boolean => !!(row.workOrderNo || row.jobNo || row.style);

async function processKWOSheet(
    worksheetReader: WorksheetReader
): Promise<{ parsedRows: KWOParsedRow[]; headerFound: boolean }> {
    const KWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "knitting factory name"];
    const MIN_SCORE = 4;
    const SCAN_LIMIT = 15;

    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, KWO_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as KWOParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildKWOColIndex(headers);

    const parsedRows: KWOParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseKWORow(allRows[i] ?? [], colIndex);
        if (isValidKWORow(parsed)) parsedRows.push(parsed);
    }

    return { parsedRows, headerFound: true };
}

async function processAWOSheet(
    worksheetReader: WorksheetReader
): Promise<{ parsedRows: AWOParsedRow[]; headerFound: boolean }> {
    const AWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "aop factory name"];
    const MIN_SCORE = 4;
    const SCAN_LIMIT = 15;

    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, AWO_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as AWOParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildAWOColIndex(headers);

    const parsedRows: AWOParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseAWORow(allRows[i] ?? [], colIndex);
        if (isValidAWORow(parsed)) parsedRows.push(parsed);
    }

    return { parsedRows, headerFound: true };
}

async function processDWOSheet(
    worksheetReader: WorksheetReader
): Promise<{ parsedRows: DWOParsedRow[]; headerFound: boolean }> {
    const DWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "dyeing factory name"];
    const MIN_SCORE = 4;
    const SCAN_LIMIT = 15;

    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, DWO_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as DWOParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildDWOColIndex(headers);

    const parsedRows: DWOParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseDWORow(allRows[i] ?? [], colIndex);
        if (isValidDWORow(parsed)) parsedRows.push(parsed);
    }

    return { parsedRows, headerFound: true };
}

// ── Main Controller ──────────────────────────────────────────────
export const fileUpload = async (req: MulterRequest, res: Response): Promise<void> => {
    console.log("📥 File upload hit");
    const startTime = Date.now();

    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(req.file.path, { sharedStrings: "cache" });

        let parsedRows: ParsedRow[] = [];
        let styleReqHeaderFound = false;
        let styleReqSheetName = "";

        let parsedRowsKWO: KWOParsedRow[] = [];
        let kwoHeaderFound = false;
        let kwoSheetName = "";

        let parsedRowsAWO: AWOParsedRow[] = [];
        let awoHeaderFound = false;
        let awoSheetName = "";

        let parsedRowsDWO: DWOParsedRow[] = [];
        let dwoHeaderFound = false;
        let dwoSheetName = "";

        for await (const worksheetReader of workbookReader) {
            const sheetName = (worksheetReader as WorksheetReader).name || "";

            if (sheetName === "STYLE REQUIRMENT") {
                const result = await processStyleReqSheet(worksheetReader as WorksheetReader);
                parsedRows = result.parsedRows;
                styleReqHeaderFound = result.headerFound;
                styleReqSheetName = sheetName;
            } else if (sheetName === "K.W.O") {
                const result = await processKWOSheet(worksheetReader as WorksheetReader);
                parsedRowsKWO = result.parsedRows;
                kwoHeaderFound = result.headerFound;
                kwoSheetName = sheetName;
            } else if (sheetName === "A.W.O") {
                const result = await processAWOSheet(worksheetReader as WorksheetReader);
                parsedRowsAWO = result.parsedRows;
                awoHeaderFound = result.headerFound;
                awoSheetName = sheetName;
            } else if (sheetName === "D.W.O") {
                const result = await processDWOSheet(worksheetReader as WorksheetReader);
                parsedRowsDWO = result.parsedRows;
                dwoHeaderFound = result.headerFound;
                dwoSheetName = sheetName;
            } else {
                // Drain unknown sheets fully — same reasoning: never break mid-stream.
                for await (const _row of worksheetReader) {
                    /* drain */
                }
            }
        }

        if (!styleReqHeaderFound && !kwoHeaderFound && !awoHeaderFound && !dwoHeaderFound) {
            res.status(400).json({ error: "Could not locate a valid header row in the Excel file." });
            return;
        }

        const jobId = randomUUID();
        const parseTime = Date.now() - startTime;

        res.send({
            success: true,
            jobId,
            fileName: req.file.originalname || req.file.filename,
            parseTimeMs: parseTime,
            styleRequirement: {
                sheetName: styleReqSheetName,
                found: styleReqHeaderFound,
                totalRows: parsedRows.length,
            },
            kwo: {
                sheetName: kwoSheetName,
                found: kwoHeaderFound,
                totalRows: parsedRowsKWO.length,
            },
            awo: {
                sheetName: awoSheetName,
                found: awoHeaderFound,
                totalRows: parsedRowsAWO.length,
            },
            dwo: {
                sheetName: dwoSheetName,
                found: dwoHeaderFound,
                totalRows: parsedRowsDWO.length,
            },
        });

        // ── Background: Parallel upload processing ─────────────────
        (async () => {
            try {
                const uploadPromises: Promise<void>[] = [];

                if (styleReqHeaderFound && parsedRows.length > 0) {
                    // console.log(`🔄 [${jobId}] Inserting Style Requirement (${parsedRows.length} rows)...`);
                    uploadPromises.push(
                        uploadDataFromFile(parsedRows, jobId)
                            .then(() => console.log(`✅ [${jobId}] Style Requirement done.`))
                    );
                }
                if (kwoHeaderFound && parsedRowsKWO.length > 0) {
                    // console.log(`🔄 [${jobId}] Inserting K.W.O (${parsedRowsKWO.length} rows)...`);
                    uploadPromises.push(
                        uploadKWODataFromFile(parsedRowsKWO, jobId)
                            .then(() => console.log(`✅ [${jobId}] K.W.O done.`))
                    );
                }
                if (awoHeaderFound && parsedRowsAWO.length > 0) {
                    // console.log(`🔄 [${jobId}] Inserting A.W.O (${parsedRowsAWO.length} rows)...`);
                    uploadPromises.push(
                        uploadAOWDataFromFile(parsedRowsAWO, jobId)
                            .then(() => console.log(`✅ [${jobId}] A.W.O done.`))
                    );
                }
                if (dwoHeaderFound && parsedRowsDWO.length > 0) {
                    // console.log(`🔄 [${jobId}] Inserting D.W.O (${parsedRowsDWO.length} rows)...`);
                    uploadPromises.push(
                        uploadDYEINGDataFromFile(parsedRowsDWO, jobId)
                            .then(() => console.log(`✅ [${jobId}] D.W.O done.`))
                    );
                }

                await Promise.all(uploadPromises);
                console.log(`🎉 [${jobId}] All background uploads completed.`);
            } catch (err: unknown) {
                console.error("❌ Background upload processing failed:", err);
            }
        })();
    } catch (error) {
        console.error("Error parsing Excel:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: "Failed to parse Excel file", details: errorMessage });
    }
};