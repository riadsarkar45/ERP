import type { Request, Response } from "express";
import { randomUUID } from "crypto";
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

        const workbook = XLSX.readFile(req.file.path);

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

        const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: null,
        });

        if (rawData.length < 3) {
            res.status(400).json({ error: "Excel file has insufficient data" });
            return;
        }

        const headerRowIndex = findHeaderRowIndex(rawData);

        if (headerRowIndex === -1) {
            res.status(400).json({
                error:
                    "Could not locate a valid header row in the Excel file. Please check the file format.",
            });
            return;
        }

        const headers = buildMergedHeaders(rawData, headerRowIndex);
        const colIndex: ColumnIndices = buildColIndex(headers);

        const dataRows: unknown[][] = rawData.slice(headerRowIndex + 1);

        const parsedRows: ParsedRow[] = dataRows
            .filter(
                (row: unknown[]) =>
                    Array.isArray(row) &&
                    row.some(
                        (cell: unknown) =>
                            cell !== "" && cell !== undefined && cell !== null
                    )
            )
            .map((row: unknown[]): ParsedRow => ({
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

        // ── Respond immediately with a jobId — don't make the client wait
        // for the DB writes. Processing continues in the background and
        // reports progress over the existing Socket.IO connection.
        const jobId = randomUUID();

        res.send({
            success: true,
            jobId,
            fileName: req.file.originalname || req.file.filename,
            sheetName: actualSheetName,
            totalRows: parsedRows.length,
        });

        // Fire-and-forget: don't await, and never let a rejection here
        // crash the process — uploadDataFromFile emits its own
        // 'upload-progress' / 'upload-complete' / 'upload-error' events.
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