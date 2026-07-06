import ExcelJS from "exceljs";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { uploadDataFromFile } from "../../helpers/uploadStyleReqData/uploadFileData";

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

type MulterRequest = Request & {
    file?: MulterFile;
};

interface ColumnIndices {
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
}

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
}

// ── Helpers ───────────────────────────────────────────────────────

const getCellValue = (row: unknown[], index: number): unknown => {
    if (!Array.isArray(row) || index < 0 || index >= row.length) return null;
    return row[index];
};

// Enhanced to handle exceljs specific objects (Rich Text, Formulas, Dates)
const asString = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val.trim();
    if (val instanceof Date) return val.toISOString().split('T')[0] ?? "";
    if (typeof val === "object" && val !== null) {
        const obj = val as any;
        if (obj.richText && Array.isArray(obj.richText)) {
            return obj.richText.map((rt: any) => rt.text || "").join("").trim();
        }
        if (obj.text !== undefined) return String(obj.text).trim();
        if (obj.result !== undefined) return String(obj.result).trim(); // Formula results
    }
    return String(val).trim();
};

const toNumber = (val: unknown): number => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return val;
    if (val instanceof Date) return 0;
    if (typeof val === "object" && val !== null) {
        const obj = val as any;
        if (obj.result !== undefined) return toNumber(obj.result);
        if (obj.text !== undefined) return toNumber(obj.text);
    }
    const cleaned = String(val).replace(/,/g, "").trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
};

const findExactCol = (headers: unknown[], name: string): number => {
    return headers.findIndex(
        (h: unknown) => asString(h).toLowerCase() === name.toLowerCase()
    );
};

const findPartialCol = (headers: unknown[], keyword: string): number => {
    return headers.findIndex((h: unknown) =>
        asString(h).toLowerCase().includes(keyword.toLowerCase())
    );
};

const KEYWORDS_FOR_SCORING = [
    "sales contract",
    "buyer",
    "job no",
    "po no",
    "style",
    "color",
    "composition",
    "finish dia",
];

const scoreHeaderRow = (row: unknown[]): number => {
    if (!Array.isArray(row)) return 0;
    return KEYWORDS_FOR_SCORING.filter((kw) =>
        row.some((cell) => asString(cell).toLowerCase().includes(kw))
    ).length;
};

const findHeaderRowIndex = (
    rows: unknown[][],
    scanLimit = 10,
    minScore = 3
): number => {
    let bestRow = -1;
    let bestScore = 0;

    const limit = Math.min(scanLimit, rows.length);
    for (let i = 0; i < limit; i++) {
        const score = scoreHeaderRow(rows[i] ?? []);
        if (score > bestScore) {
            bestScore = score;
            bestRow = i;
        }
    }

    return bestScore >= minScore ? bestRow : -1;
};

const buildMergedHeaders = (
    rawData: unknown[][],
    headerRowIndex: number
): unknown[] => {
    const fieldHeaders: unknown[] = rawData[headerRowIndex] ?? [];
    const sectionHeaders: unknown[] =
        headerRowIndex > 0 ? rawData[headerRowIndex - 1] ?? [] : [];

    return fieldHeaders.map((cell, idx) =>
        asString(cell) ? cell : sectionHeaders[idx]
    );
};

const buildColIndex = (headers: unknown[]): ColumnIndices => ({
    salesContractNo: findPartialCol(headers, "sales contract"),
    buyer: findExactCol(headers, "buyer"),
    jobNo: findPartialCol(headers, "job no"),
    poNo: findPartialCol(headers, "po no"),
    style: findExactCol(headers, "style"),
    color: findExactCol(headers, "color"),
    composition: findExactCol(headers, "composition"),
    finishDia: findPartialCol(headers, "finish dia"),
    orderQty: findPartialCol(headers, "order qty"),
    finishFabricRequired: findPartialCol(headers, "finish fabric required"),
});

const parseRow = (row: unknown[], colIndex: ColumnIndices): ParsedRow => ({
    salesContractNo: asString(getCellValue(row, colIndex.salesContractNo)) || "N/A",
    buyer: asString(getCellValue(row, colIndex.buyer)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    poNo: asString(getCellValue(row, colIndex.poNo)),
    style: asString(getCellValue(row, colIndex.style)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    finishDia: asString(getCellValue(row, colIndex.finishDia)),
    orderQty: toNumber(getCellValue(row, colIndex.orderQty)),
    finishFabricRequired: toNumber(getCellValue(row, colIndex.finishFabricRequired)),
});

// ── Streaming Sheet Processor ─────────────────────────────────────
async function processSheet(worksheetReader: any) {
    let headerRowIndex = -1;
    let headers: unknown[] = [];
    let colIndex: ColumnIndices | null = null;
    let parsedRows: ParsedRow[] = [];
    
    const rowBuffer: unknown[][] = [];
    const SCAN_LIMIT = 10;
    const MIN_SCORE = 3;

    // Stream row by row
    for await (const row of worksheetReader) {
        // row.values is a sparse array where index 0 is undefined in exceljs
        const denseRow: unknown[] = [];
        if (Array.isArray(row.values)) {
            for (let i = 1; i < row.values.length; i++) {
                denseRow.push(row.values[i]);
            }
        }
        
        if (headerRowIndex === -1) {
            rowBuffer.push(denseRow);
            if (rowBuffer.length >= SCAN_LIMIT) {
                const foundIdx = findHeaderRowIndex(rowBuffer, SCAN_LIMIT, MIN_SCORE);
                if (foundIdx !== -1) {
                    headerRowIndex = foundIdx;
                    headers = buildMergedHeaders(rowBuffer, headerRowIndex);
                    colIndex = buildColIndex(headers);
                    
                    // Process any data rows that were already buffered after the header
                    for (let i = headerRowIndex + 1; i < rowBuffer.length; i++) {
                        const bufferedRow = rowBuffer[i] ?? [];
                        parsedRows.push(parseRow(bufferedRow, colIndex));
                    }
                }
            }
        } else {
            // Header found, just parse and push immediately (Low RAM!)
            parsedRows.push(parseRow(denseRow, colIndex!));
        }
    }
    
    // Fallback if header wasn't found in the first 10 rows but exists later
    if (headerRowIndex === -1 && rowBuffer.length > 0) {
        const foundIdx = findHeaderRowIndex(rowBuffer, rowBuffer.length, MIN_SCORE);
        if (foundIdx !== -1) {
            headerRowIndex = foundIdx;
            headers = buildMergedHeaders(rowBuffer, headerRowIndex);
            colIndex = buildColIndex(headers);
            for (let i = headerRowIndex + 1; i < rowBuffer.length; i++) {
                parsedRows.push(parseRow(rowBuffer[i] ?? [], colIndex!));
            }
        }
    }
    
    return { parsedRows, headerFound: headerRowIndex !== -1 };
}

// ── Main Controller ──────────────────────────────────────────────
export const fileUpload = async (
    req: MulterRequest,
    res: Response
): Promise<void> => {
    console.log("📥 File upload hit");

    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        // Initialize Streaming Reader (Low Memory Footprint)
        const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(req.file.path, {
            sharedStrings: "cache", // Caches shared strings without loading the whole workbook
        });

        const possibleNames = ["Styling Requirement", "Styling Requirement"];
        let actualSheetName = "";
        let isFirstSheet = true;
        
        let parsedRows: ParsedRow[] = [];
        let headerFound = false;

        // Stream through sheets one by one
        for await (const worksheetReader of workbookReader) {
            const sheetName = (worksheetReader as any).name || "";
            const isTarget = possibleNames.includes(sheetName);
            
            if (isTarget) {
                actualSheetName = sheetName;
                const result = await processSheet(worksheetReader);
                parsedRows = result.parsedRows;
                headerFound = result.headerFound;
                break; // Found the target sheet, stop reading further sheets
            } else if (isFirstSheet) {
                // Tentatively process the first sheet as a fallback
                actualSheetName = sheetName;
                const result = await processSheet(worksheetReader);
                parsedRows = result.parsedRows;
                headerFound = result.headerFound;
                isFirstSheet = false;
            } else {
                continue; // Skip other sheets if we already have a fallback
            }
        }

        if (!headerFound) {
            res.status(400).json({
                error: "Could not locate a valid header row in the Excel file. Please check the file format.",
            });
            return;
        }

        // ── Respond immediately with a jobId — don't make the client wait
        const jobId = randomUUID();

        res.send({
            success: true,
            jobId,
            fileName: req.file.originalname || req.file.filename,
            sheetName: actualSheetName,
            totalRows: parsedRows.length,
        });

        // Fire-and-forget background processing
        uploadDataFromFile(parsedRows, jobId).catch((err) => {
            console.error("Background upload processing failed:", err);
        });
    } catch (error) {
        console.error(" Error parsing Excel:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
            error: "Failed to parse Excel file",
            details: errorMessage,
        });
    }
};