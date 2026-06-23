import type { Request, Response } from "express";
import XLSX from "xlsx";
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

interface PreviewRow {
    id: number;
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

interface ParseResponse {
    success: boolean;
    fileName: string;
    sheetName: string;
    headerRowIndex: number;
    totalRows: number;
    columns: string[];
    data: PreviewRow[];
}

interface ErrorResponse {
    error: string;
    details?: string;
}

// ── Helpers ───────────────────────────────────────────────────────

const getCellValue = (row: unknown[], index: number): unknown => {
    if (!Array.isArray(row) || index < 0 || index >= row.length) return null;
    return row[index];
};

const asString = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val.trim();
    return String(val).trim();
};

const toNumber = (val: unknown): number => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number") return val;
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

/** Keywords used to detect which row is the real field-level header row */
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

/**
 * Scan the first N rows and find the row most likely to be the
 * field-level header row (e.g. "SALES CONTRACT NO.", "BUYER", ...),
 * by counting how many expected keywords it contains.
 */
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

/**
 * This sheet has a two-tier header: a "section" row (e.g. 'ORDER QTY',
 * 'REQUIRNENT'S') sitting one row above the real field-level header
 * row. Some field columns (like the raw order quantity column) have
 * NO label of their own in the field row — they only inherit meaning
 * from the section row above them. This merges the two: use the
 * field-level label where present, otherwise fall back to the section
 * label directly above it.
 */
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

// ── Main Controller ──────────────────────────────────────────────
export const fileUpload = async (
    req: MulterRequest,
    res: Response<ParseResponse | ErrorResponse>
): Promise<void> => {
    console.log("📥 File upload hit");

    try {
        if (!req.file) {
            res.status(400).json({ error: "No file uploaded" });
            return;
        }

        // 1. Read Excel file
        const workbook = XLSX.readFile(req.file.path);

        // 2. Get the target sheet. NOTE: the source file has a typo —
        // the actual sheet name is "Styling Requirement" (missing the
        // "e"), not "Styling Requirement". We check both spellings so
        // a future corrected file still works.
        const possibleNames = ["Styling Requirement", "Styling Requirement"];
        const firstSheetName =
            workbook.SheetNames && workbook.SheetNames.length > 0
                ? workbook.SheetNames[0]
                : undefined;

        const matchedSheetName = possibleNames.find(
            (name) => workbook.Sheets[name]
        );
        const worksheet =
            (matchedSheetName ? workbook.Sheets[matchedSheetName] : undefined) ??
            (firstSheetName ? workbook.Sheets[firstSheetName] : undefined);

        if (!worksheet) {
            res.status(400).json({ error: "No valid sheet found in Excel file" });
            return;
        }

        const actualSheetName = matchedSheetName ?? firstSheetName ?? "";

        // 3. Convert to array of arrays
        const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
        });

        if (rawData.length < 3) {
            res.status(400).json({ error: "Excel file has insufficient data" });
            return;
        }

        // 4. Find the field-level header row dynamically (it's row 4 in
        // this file, but we don't hardcode it in case other files shift).
        const headerRowIndex = findHeaderRowIndex(rawData);

        if (headerRowIndex === -1) {
            res.status(400).json({
                error:
                    "Could not locate a valid header row in the Excel file. Please check the file format.",
            });
            return;
        }

        // 5. Merge the section row (row above) with the field row so
        // columns like raw order qty (which only has a section label,
        // e.g. 'ORDER QTY', and no field-level label) still resolve.
        const headers = buildMergedHeaders(rawData, headerRowIndex);
        console.log(`📋 Headers found at row ${headerRowIndex}:`, headers);

        // 6. Map columns
        const colIndex: ColumnIndices = buildColIndex(headers);
        console.log("🔢 Column Indices:", colIndex);

        const missingCols: string[] = (Object.entries(colIndex) as [string, number][])
            .filter(([, idx]: [string, number]) => idx === -1)
            .map(([key]: [string, number]) => key);

        if (missingCols.length > 0) {
            console.warn("⚠️ Missing columns:", missingCols);
        }

        // 7. Data rows start right after the detected header row
        const dataRows: unknown[][] = rawData.slice(headerRowIndex + 1);

        // 8. Map to required fields only
        const previewData: PreviewRow[] = dataRows
            .filter(
                (row: unknown[]) =>
                    Array.isArray(row) &&
                    row.some(
                        (cell: unknown) =>
                            cell !== "" && cell !== undefined && cell !== null
                    )
            )
            .map((row: unknown[], index: number): PreviewRow => ({
                id: index + 1,
                salesContractNo:
                    asString(getCellValue(row, colIndex.salesContractNo)) || "N/A",
                buyer: asString(getCellValue(row, colIndex.buyer)),
                jobNo: asString(getCellValue(row, colIndex.jobNo)),
                poNo: asString(getCellValue(row, colIndex.poNo)),
                style: asString(getCellValue(row, colIndex.style)),
                color: asString(getCellValue(row, colIndex.color)),
                composition: asString(getCellValue(row, colIndex.composition)),
                finishDia: asString(getCellValue(row, colIndex.finishDia)),
                orderQty: toNumber(getCellValue(row, colIndex.orderQty)),
                finishFabricRequired: toNumber(
                    getCellValue(row, colIndex.finishFabricRequired)
                ),
            }));
        const data = await uploadDataFromFile(previewData);

        // 9. Send response
        res.send({
            success: true,
            fileName: req.file.originalname || req.file.filename,
            sheetName: actualSheetName,
            headerRowIndex,
            totalRows: previewData.length,
            columns: headers.map((header) => asString(header)),
            data,
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