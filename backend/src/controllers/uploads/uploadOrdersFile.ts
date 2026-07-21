import ExcelJS from "exceljs";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { uploadDataFromFile } from "../../helpers/uploadStyleReqData/uploadFileData";
import { uploadKWODataFromFile } from "../../helpers/uploadStyleReqData/uploadWorkOrder";

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
    aopFactoryName: string;
    aopWorkOrderQty: number;
    aopPricePerKg: number;
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
    aopFactoryName: number;
    aopWorkOrderQty: number;
    aopPricePerKg: number;
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

// ── Helpers ───────────────────────────────────────────────────────
const getCellValue = (row: unknown[], index: number): unknown => {
    if (!Array.isArray(row) || index < 0 || index >= row.length) return null;
    return row[index];
};

const asString = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val.trim();
    if (val instanceof Date) return val.toISOString().split('T')[0] ?? "";
    if (typeof val === "object" && val !== null) {
        const obj = val as Record<string, any>;
        if (obj.richText && Array.isArray(obj.richText)) {
            return obj.richText.map((rt: any) => rt.text || "").join("").trim();
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
        const obj = val as Record<string, any>;
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

async function scanForHeaderRow(
    worksheetReader: any,
    keywords: string[],
    minScore: number,
    scanLimit: number
): Promise<{ rowBuffer: unknown[][]; headerRowIndex: number }> {
    const rowBuffer: unknown[][] = [];
    let headerRowIndex = -1;

    const scoreRow = (row: unknown[]): number => {
        if (!Array.isArray(row)) return 0;
        return keywords.filter((kw) => row.some((cell) => asString(cell).toLowerCase().includes(kw))).length;
    };

    for await (const row of worksheetReader) {
        const denseRow: unknown[] = [];
        if (Array.isArray(row.values)) {
            for (let i = 1; i < row.values.length; i++) denseRow.push(row.values[i]);
        }
        rowBuffer.push(denseRow);

        if (headerRowIndex === -1 && rowBuffer.length >= scanLimit) {
            let bestRow = -1, bestScore = 0;
            for (let i = 0; i < rowBuffer.length; i++) {
                const score = scoreRow(rowBuffer[i] ?? []);
                if (score > bestScore) { bestScore = score; bestRow = i; }
            }
            if (bestScore >= minScore) headerRowIndex = bestRow;
        }
    }

    if (headerRowIndex === -1 && rowBuffer.length > 0) {
        let bestRow = -1, bestScore = 0;
        for (let i = 0; i < rowBuffer.length; i++) {
            const score = scoreRow(rowBuffer[i] ?? []);
            if (score > bestScore) { bestScore = score; bestRow = i; }
        }
        if (bestScore >= minScore) headerRowIndex = bestRow;
    }

    return { rowBuffer, headerRowIndex };
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

async function processStyleReqSheet(worksheetReader: any) {
    const STYLE_REQ_KEYWORDS = ["sales contract", "buyer", "job no", "po no", "style", "color", "composition"];
    const MIN_SCORE = 4;
    const SCAN_LIMIT = 15;

    const { rowBuffer, headerRowIndex } = await scanForHeaderRow(worksheetReader, STYLE_REQ_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as ParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(rowBuffer, headerRowIndex);
    const colIndex = buildStyleReqColIndex(headers);

    const parsedRows: ParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < rowBuffer.length; i++) {
        parsedRows.push(parseStyleReqRow(rowBuffer[i] ?? [], colIndex));
    }

    return { parsedRows, headerFound: true };
}

// ── K.W.O Specific Parsing ────────────────────────────────────────
const buildKWOCOlIndex = (headers: unknown[]): KWOColumnIndices => ({
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
const buildAWOCOlIndex = (headers: unknown[]): AWOColumnIndices => ({
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
    aopFactoryName: findPartialCol(headers, "aop factory name"),
    aopWorkOrderQty: findPartialCol(headers, "aop work order"),
    aopPricePerKg: findPartialCol(headers, "aop price per kg"),
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
    aopFactoryName: asString(getCellValue(row, colIndex.aopFactoryName)),
    aopWorkOrderQty: toNumber(getCellValue(row, colIndex.aopWorkOrderQty)),
    aopPricePerKg: toNumber(getCellValue(row, colIndex.aopPricePerKg)),
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

async function processKWOSheet(worksheetReader: any) {
    const KWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "knitting factory name"];
    const MIN_SCORE = 4;
    const SCAN_LIMIT = 15;

    const { rowBuffer, headerRowIndex } = await scanForHeaderRow(worksheetReader, KWO_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as KWOParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(rowBuffer, headerRowIndex);
    const colIndex = buildKWOCOlIndex(headers);

    const parsedRows: KWOParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < rowBuffer.length; i++) {
        parsedRows.push(parseKWORow(rowBuffer[i] ?? [], colIndex));
    }

    return { parsedRows, headerFound: true };
}
async function processAWOSheet(worksheetReader: any) {
    const AWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "aop factory name"];
    const MIN_SCORE = 4;
    const SCAN_LIMIT = 15;

    const { rowBuffer, headerRowIndex } = await scanForHeaderRow(worksheetReader, AWO_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as AWOParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(rowBuffer, headerRowIndex);
    const colIndex = buildAWOCOlIndex(headers);

    const parsedRows: AWOParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < rowBuffer.length; i++) {
        parsedRows.push(parseAWORow(rowBuffer[i] ?? [], colIndex));
    }

    return { parsedRows, headerFound: true };
}

// ── Main Controller ──────────────────────────────────────────────
export const fileUpload = async (req: MulterRequest, res: Response): Promise<void> => {
    console.log("📥 File upload hit");

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
        for await (const worksheetReader of workbookReader) {
            const sheetName = (worksheetReader as any).name || "";

            if (sheetName === "STYLE REQUIRMENT") {
                const result = await processStyleReqSheet(worksheetReader);
                parsedRows = result.parsedRows;
                styleReqHeaderFound = result.headerFound;
                styleReqSheetName = sheetName;
            } else if (sheetName === "K.W.O") {
                const result = await processKWOSheet(worksheetReader);
                parsedRowsKWO = result.parsedRows;
                kwoHeaderFound = result.headerFound;
                kwoSheetName = sheetName;
            } else if (sheetName === "A.W.O") {
                // const result = await processKWOSheet(worksheetReader);
                const result = await processAWOSheet(worksheetReader)
                parsedRowsAWO = result.parsedRows;
                awoHeaderFound = result.headerFound;
                awoSheetName = sheetName;
            } else {
                for await (const _row of worksheetReader) { /* drain */ }
            }
        }

        if (!styleReqHeaderFound && !kwoHeaderFound) {
            res.status(400).json({ error: "Could not locate a valid header row in the Excel file." });
            return;
        }

        const jobId = randomUUID();
        res.send({
            success: true,
            jobId,
            fileName: req.file.originalname || req.file.filename,
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
        });

        // ── Background: Style Req FIRST, then KWO ──
        (async () => {
            try {
                if (styleReqHeaderFound && parsedRows.length > 0) {
                    console.log(`🔄 [${jobId}] Inserting Style Requirement (${parsedRows.length} rows)...`);
                    await uploadDataFromFile(parsedRows, jobId);
                    console.log(`✅ [${jobId}] Style Requirement done.`);
                }
                if (kwoHeaderFound && parsedRowsKWO.length > 0) {
                    console.log(`🔄 [${jobId}] Inserting K.W.O (${parsedRowsKWO.length} rows)...`);
                    await uploadKWODataFromFile(parsedRowsKWO, jobId);
                    console.log(`✅ [${jobId}] K.W.O done.`);
                }
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