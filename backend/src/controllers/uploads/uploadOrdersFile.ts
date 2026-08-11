import ExcelJS from "exceljs";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { uploadDataFromFile } from "../../helpers/uploadStyleReqData/uploadFileData";
import { uploadKWODataFromFile } from "../../helpers/uploadStyleReqData/uploadWorkOrder";
import { uploadAOWDataFromFile } from "../../helpers/uploadStyleReqData/uploadawoOrder";
import { uploadDYEINGDataFromFile } from "../../helpers/uploadStyleReqData/uploadDyeingOrder";
import { uploadAopDeliveryDataFromFile, type AOPDeliveryParsedRow } from "../../helpers/uploadStyleReqData/uploadawoDeliveres";
import { uploadYarnGreyRcvdDataFromFile, type YarnGreyRcvdParsedRow } from "../../helpers/uploadStyleReqData/uploadYarnDevData";
import { uploadDyeingGreyDeliveryDataFromFile, type DyeingGreyDeliveryParsedRow } from "../../helpers/uploadStyleReqData/uploadDyeingGreyDev";
// import { uploadDyeing type DyeingGreyDeliveryParsedRow } from "../../helpers/uploadStyleReqData/uploadDyeingGreyDev";

// ⚠️ Adjust this path to match where you saved the helper file provided earlier
// import { uploadAopDeliveryDataFromFile, type AOPDeliveryParsedRow } from "../../helpers/uploadStyleReqData/uploadAopDelivery"; 

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
    fabricReturnFromAop: number
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
    fabricReturnFromAop: number
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

// ── AOP DEL. & RCVD Specific Parsing ──────────────────────────────
interface AOPDeliveryColumnIndices {
    challanDate: number;
    challanNo: number;
    month: number;
    salesContractNo: number;
    buyer: number;
    jobNo: number;
    poNo: number;
    style: number;
    color: number;
    composition: number;
    deliveryForAop: number;
    afterAopFabricRcvd: number;
    aopFinishFabricRcvp: number;
    aopReceivedFromFactoryName: number;
    aopFabricDeliveryFactoryNameSM: number;
    aopFinishFabricRcvd: number;
    fabricReturnFromAop: number
}

const parseDateValue = (val: unknown): Date | null => {
    if (val instanceof Date) return val;
    if (typeof val === "string") {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === "number" && val > 25569) {
        return new Date(Math.round((val - 25569) * 86400 * 1000)); // Excel serial date
    }
    return null;
};

const buildAOPDeliveryColIndex = (headers: unknown[]): AOPDeliveryColumnIndices => ({
    challanDate: findPartialCol(headers, "date of challan"),
    challanNo: findPartialCol(headers, "challan no"),
    month: findPartialCol(headers, "month"),
    salesContractNo: findPartialCol(headers, "sales contract"),
    buyer: findPartialCol(headers, "buyer"),
    jobNo: findPartialCol(headers, "job no"),
    poNo: findPartialCol(headers, "po no"),
    style: findPartialCol(headers, "style"),
    color: findPartialCol(headers, "color"),
    composition: findPartialCol(headers, "composition"),
    deliveryForAop: findPartialCol(headers, "delivery for aop"),
    afterAopFabricRcvd: findPartialCol(headers, "after aop fabric rcvd"),
    aopFinishFabricRcvd: findPartialCol(headers, "aop finish fabric rcvd"), // 👈 ADD THIS
    aopReceivedFromFactoryName: findPartialCol(headers, "aop received from factory"),
    aopFabricDeliveryFactoryNameSM: findPartialCol(headers, "aop fabric delivery factory"),
    // aopFinishFabricRcvd: toNumber(getCellValue(row, colIndex.aopFinishFabricRcvd)),
    aopFinishFabricRcvp: findPartialCol(headers, "aop finish fabric rcvd"),
    fabricReturnFromAop: findPartialCol(headers, "fabric return from aop")

});

const parseAOPDeliveryRow = (row: unknown[], colIndex: AOPDeliveryColumnIndices): AOPDeliveryParsedRow => ({
    challanDate: parseDateValue(getCellValue(row, colIndex.challanDate)),
    challanNo: toNumber(getCellValue(row, colIndex.challanNo)),
    month: asString(getCellValue(row, colIndex.month)),
    salesContractNo: asString(getCellValue(row, colIndex.salesContractNo)),
    buyer: asString(getCellValue(row, colIndex.buyer)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    poNo: asString(getCellValue(row, colIndex.poNo)),
    style: asString(getCellValue(row, colIndex.style)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    deliveryForAop: toNumber(getCellValue(row, colIndex.deliveryForAop)),
    afterAopFabricRcvd: toNumber(getCellValue(row, colIndex.afterAopFabricRcvd)),
    aopReceivedFromFactoryName: asString(getCellValue(row, colIndex.aopReceivedFromFactoryName)),
    aopFinishFabricRcvd: toNumber(getCellValue(row, colIndex.aopFinishFabricRcvd)),
    aopFabricDeliveryFactoryNameSM: asString(getCellValue(row, colIndex.aopFabricDeliveryFactoryNameSM)),
    fabricReturnFromAop: toNumber(getCellValue(row, colIndex.fabricReturnFromAop))
});

// ── YARN & GREY RCVD Specific Parsing ──────────────────────────────
interface YarnGreyRcvdColumnIndices {
    challanDate: number;
    challanNo: number;
    jobNo: number;
    color: number;
    composition: number;
    yarnDeliveryForKnitting: number;
    greyReceivedQty: number;
    yarnReturn: number;
    nameOfKnittingFactory: number;
}

const buildYarnGreyRcvdColIndex = (headers: unknown[]): YarnGreyRcvdColumnIndices => ({
    challanDate: findPartialCol(headers, "date of challan"),
    challanNo: findPartialCol(headers, "challan no"),
    jobNo: findPartialCol(headers, "job no"),
    color: findPartialCol(headers, "color"),
    composition: findPartialCol(headers, "composition"),
    yarnDeliveryForKnitting: findPartialCol(headers, "yarn delivery for knitting"),
    greyReceivedQty: findPartialCol(headers, "grey received"),
    yarnReturn: findPartialCol(headers, "yarn return"),
    nameOfKnittingFactory: findPartialCol(headers, "name of knitting factory"),
});

const parseYarnGreyRcvdRow = (row: unknown[], colIndex: YarnGreyRcvdColumnIndices): YarnGreyRcvdParsedRow => ({
    challanDate: parseDateValue(getCellValue(row, colIndex.challanDate)),
    challanNo: toNumber(getCellValue(row, colIndex.challanNo)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    yarnDeliveryForKnitting: toNumber(getCellValue(row, colIndex.yarnDeliveryForKnitting)),
    greyReceivedQty: toNumber(getCellValue(row, colIndex.greyReceivedQty)),
    yarnReturn: toNumber(getCellValue(row, colIndex.yarnReturn)),
    nameOfKnittingFactory: asString(getCellValue(row, colIndex.nameOfKnittingFactory)),
});

const isValidYarnGreyRcvdRow = (row: YarnGreyRcvdParsedRow): boolean => {
    return !!(row.jobNo && (row.yarnDeliveryForKnitting > 0 || row.greyReceivedQty > 0 || row.yarnReturn > 0));
};

async function processYarnGreyRcvdSheet(
    worksheetReader: WorksheetReader
): Promise<{ parsedRows: YarnGreyRcvdParsedRow[]; headerFound: boolean }> {
    const YARN_GREY_RCVD_KEYWORDS = ["challan no", "job no", "yarn delivery for knitting", "grey received"];
    const MIN_SCORE = 2;
    const SCAN_LIMIT = 15;

    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, YARN_GREY_RCVD_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as YarnGreyRcvdParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildYarnGreyRcvdColIndex(headers);

    const parsedRows: YarnGreyRcvdParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseYarnGreyRcvdRow(allRows[i] ?? [], colIndex);
        if (isValidYarnGreyRcvdRow(parsed)) parsedRows.push(parsed);
    }

    return { parsedRows, headerFound: true };
}

const isValidAOPDeliveryRow = (row: AOPDeliveryParsedRow): boolean => {
    return !!(
        row.jobNo &&
        (row.deliveryForAop > 0 ||
            row.afterAopFabricRcvd > 0 ||
            row.aopFinishFabricRcvd > 0 ||
            row.fabricReturnFromAop > 0)
    );
};

async function processAOPDeliverySheet(
    worksheetReader: WorksheetReader
): Promise<{ parsedRows: AOPDeliveryParsedRow[]; headerFound: boolean }> {
    // Clean keywords: the scanner will automatically strip spaces and match them perfectly
    const AOP_DEL_KEYWORDS = ["challan no", "job no", "delivery for aop", "after aop fabric rcvd", "aop finish fabric rcvd", "fabric return from aop"];
    const MIN_SCORE = 2;
    const SCAN_LIMIT = 15;

    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, AOP_DEL_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as AOPDeliveryParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildAOPDeliveryColIndex(headers);

    const parsedRows: AOPDeliveryParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseAOPDeliveryRow(allRows[i] ?? [], colIndex);
        if (isValidAOPDeliveryRow(parsed)) parsedRows.push(parsed);
    }

    return { parsedRows, headerFound: true };
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

// ✅ ROBUST: Ignores random extra spaces in Excel headers (e.g., "CHALLAN          NO")
const findPartialCol = (headers: unknown[], keyword: string): number => {
    const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, "");
    return headers.findIndex((h: unknown) => {
        const normalizedHeader = asString(h).toLowerCase().replace(/\s+/g, "");
        return normalizedHeader.includes(normalizedKeyword);
    });
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
async function readAllRowsAndFindHeader(
    worksheetReader: WorksheetReader,
    keywords: string[],
    minScore: number,
    scanLimit: number
): Promise<{ allRows: unknown[][]; headerRowIndex: number }> {
    const allRows: unknown[][] = [];

    // Normalize keywords by removing all spaces to handle erratic Excel spacing
    const normalizedKeywords = keywords.map((kw) => kw.toLowerCase().replace(/\s+/g, ""));

    const scoreRow = (row: unknown[]): number => {
        if (!Array.isArray(row)) return 0;
        return normalizedKeywords.filter((kw) =>
            row.some((cell) => {
                // Normalize the cell content by removing all spaces before checking
                const normalizedCell = asString(cell).toLowerCase().replace(/\s+/g, "");
                return normalizedCell.includes(kw);
            })
        ).length;
    };

    for await (const row of worksheetReader) {
        const denseRow: unknown[] = [];
        if (Array.isArray(row.values)) {
            for (let i = 1; i < row.values.length; i++) denseRow.push(row.values[i]);
        }
        allRows.push(denseRow);
    }

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

// ── DYEING GREY DEL. & RCVD Specific Parsing ──────────────────────────────
interface DyeingGreyDeliveryColumnIndices {
    challanDate: number;
    challanNo: number;
    jobNo: number;
    color: number;
    composition: number;
    greyDeliveryQty: number;
    greyReceivedQty: number;
    finishReceivedQty: number; // ✅ ADDED
    dyeingFactoryName: number;
    toFactory: number;
    fromFactory: number;
    greyReturnFromFactory: number;
}

const buildDyeingGreyDeliveryColIndex = (headers: unknown[]): DyeingGreyDeliveryColumnIndices => ({
    challanDate: findPartialCol(headers, "date of challan"),
    challanNo: findPartialCol(headers, "challan no"),
    jobNo: findPartialCol(headers, "job no"),
    color: findPartialCol(headers, "color"),
    composition: findPartialCol(headers, "composition"),
    
    // ✅ UPDATED: Keywords now perfectly match the actual Excel headers (spaces are ignored)
    greyDeliveryQty: findPartialCol(headers, "grey fabric del"),       // Matches "GREY FABRIC DEL. FOR DYEING"
    greyReceivedQty: findPartialCol(headers, "grey fabric rcvd"),      // Matches "GREY FABRIC RCVD FROM DYEING"
    finishReceivedQty: findPartialCol(headers, "finish fabric rcvd"),  // Matches "FINISH FABRIC RCVD FROM DYEING"
    
    dyeingFactoryName: findPartialCol(headers, "dyeing factory name"), // Matches "GREY DEL & RECVED FROM DYEING FACTORY NAME"
    toFactory: findPartialCol(headers, "finished fabric delivery"),    // Matches "FINISHED FABRIC DELIVERY FACTORY NAME"
    greyReturnFromFactory: findPartialCol(headers, "grey return from dyeing"),
    fromFactory: findPartialCol(headers, "remarks"),                   // Remarks often contains "FROM [Factory Name]"
});

const parseDyeingGreyDeliveryRow = (row: unknown[], colIndex: DyeingGreyDeliveryColumnIndices): DyeingGreyDeliveryParsedRow => ({
    challanDate: parseDateValue(getCellValue(row, colIndex.challanDate)),
    challanNo: toNumber(getCellValue(row, colIndex.challanNo)),
    jobNo: asString(getCellValue(row, colIndex.jobNo)),
    color: asString(getCellValue(row, colIndex.color)),
    composition: asString(getCellValue(row, colIndex.composition)),
    greyDeliveryQty: toNumber(getCellValue(row, colIndex.greyDeliveryQty)),
    greyReceivedQty: toNumber(getCellValue(row, colIndex.greyReceivedQty)),
    finishReceivedQty: toNumber(getCellValue(row, colIndex.finishReceivedQty)), // ✅ ADDED
    dyeingFactoryName: asString(getCellValue(row, colIndex.dyeingFactoryName)),
    toFactory: asString(getCellValue(row, colIndex.toFactory)),
    fromFactory: asString(getCellValue(row, colIndex.fromFactory)),
    greyReturnFromFactory: toNumber(getCellValue(row, colIndex.greyReturnFromFactory))
});

const isValidDyeingGreyDeliveryRow = (row: DyeingGreyDeliveryParsedRow): boolean => {
    // ✅ UPDATED: Now checks for finishReceivedQty as well
    return !!(row.jobNo && (row.greyDeliveryQty > 0 || row.greyReceivedQty > 0 || row.finishReceivedQty > 0 || row.greyReturnFromFactory > 0));
};


async function processDyeingGreyDeliverySheet(
    worksheetReader: WorksheetReader
): Promise<{ parsedRows: DyeingGreyDeliveryParsedRow[]; headerFound: boolean }> {
    const DYEING_GREY_DELIVERY_KEYWORDS = ["challan no", "job no", "dyeing delivery", "dyeing received", "grey return from dyeing"];
    const MIN_SCORE = 2;
    const SCAN_LIMIT = 15;

    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, DYEING_GREY_DELIVERY_KEYWORDS, MIN_SCORE, SCAN_LIMIT);

    if (headerRowIndex === -1) {
        return { parsedRows: [] as DyeingGreyDeliveryParsedRow[], headerFound: false };
    }

    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildDyeingGreyDeliveryColIndex(headers);

    const parsedRows: DyeingGreyDeliveryParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseDyeingGreyDeliveryRow(allRows[i] ?? [], colIndex);
        if (isValidDyeingGreyDeliveryRow(parsed)) parsedRows.push(parsed);
    }

    return { parsedRows, headerFound: true };
}

// ── Sheet Parsing Functions (STYLE, KWO, AWO, DWO) ────────────────
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
    processLoss: Math.round(toNumber(getCellValue(row, colIndex.processLoss)) * 100 * 100) / 100,
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
    fabricReturnFromAop: findPartialCol(headers, "fabric return from aop")
});

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
    fabricReturnFromAop: toNumber(getCellValue(row, colIndex.fabricReturnFromAop))
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

const isValidKWORow = (row: KWOParsedRow): boolean => !!(row.workOrderNo || row.jobNo || row.style);
const isValidAWORow = (row: AWOParsedRow): boolean => !!(row.workOrderNo || row.jobNo || row.style);
const isValidDWORow = (row: DWOParsedRow): boolean => !!(row.workOrderNo || row.jobNo || row.style);

async function processKWOSheet(worksheetReader: WorksheetReader): Promise<{ parsedRows: KWOParsedRow[]; headerFound: boolean }> {
    const KWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "knitting factory name"];
    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, KWO_KEYWORDS, 4, 15);
    if (headerRowIndex === -1) return { parsedRows: [] as KWOParsedRow[], headerFound: false };
    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildKWOColIndex(headers);
    const parsedRows: KWOParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseKWORow(allRows[i] ?? [], colIndex);
        if (isValidKWORow(parsed)) parsedRows.push(parsed);
    }
    return { parsedRows, headerFound: true };
}

async function processAWOSheet(worksheetReader: WorksheetReader): Promise<{ parsedRows: AWOParsedRow[]; headerFound: boolean }> {
    const AWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "aop factory name"];
    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, AWO_KEYWORDS, 4, 15);
    if (headerRowIndex === -1) return { parsedRows: [] as AWOParsedRow[], headerFound: false };
    const headers = buildMergedHeaders(allRows, headerRowIndex);
    const colIndex = buildAWOColIndex(headers);
    const parsedRows: AWOParsedRow[] = [];
    for (let i = headerRowIndex + 1; i < allRows.length; i++) {
        const parsed = parseAWORow(allRows[i] ?? [], colIndex);
        if (isValidAWORow(parsed)) parsedRows.push(parsed);
    }
    return { parsedRows, headerFound: true };
}

async function processDWOSheet(worksheetReader: WorksheetReader): Promise<{ parsedRows: DWOParsedRow[]; headerFound: boolean }> {
    const DWO_KEYWORDS = ["work order no", "month", "job no", "style", "color", "composition", "dyeing factory name"];
    const { allRows, headerRowIndex } = await readAllRowsAndFindHeader(worksheetReader, DWO_KEYWORDS, 4, 15);
    if (headerRowIndex === -1) return { parsedRows: [] as DWOParsedRow[], headerFound: false };
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

        // ✅ NEW: AOP Delivery variables
        let parsedRowsAOPDel: AOPDeliveryParsedRow[] = [];
        let aopDelHeaderFound = false;
        let aopDelSheetName = "";

        let parsedRowsYarnGreyRcvd: YarnGreyRcvdParsedRow[] = [];
        let yarnGreyRcvdHeaderFound = false;
        let yarnGreyRcvdSheetName = "";

        let parsedRowsDyeingGreyDelivery: DyeingGreyDeliveryParsedRow[] = [];
        let dyeingGreyDeliveryHeaderFound = false;
        let dyeingGreyDeliverySheetName = "";

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
            } else if (sheetName === "AOP DEL. & RCVD" || sheetName === "AOP DEL & RCVD") {
                // ✅ NEW: Process AOP Delivery sheet
                const result = await processAOPDeliverySheet(worksheetReader as WorksheetReader);
                parsedRowsAOPDel = result.parsedRows;
                aopDelHeaderFound = result.headerFound;
                aopDelSheetName = sheetName;
            } else if (sheetName === "YARN & GREY RCVD" || sheetName === "YARN GREY RCVD") {
                const result = await processYarnGreyRcvdSheet(worksheetReader as WorksheetReader);
                parsedRowsYarnGreyRcvd = result.parsedRows;
                yarnGreyRcvdHeaderFound = result.headerFound;
                yarnGreyRcvdSheetName = sheetName;
            } else if (sheetName === "DYEING GREY DEL. & RCVD" || sheetName === "DYEING GREY DELIVERY") {
                const result = await processDyeingGreyDeliverySheet(worksheetReader as WorksheetReader);
                parsedRowsDyeingGreyDelivery = result.parsedRows;
                dyeingGreyDeliveryHeaderFound = result.headerFound;
                dyeingGreyDeliverySheetName = sheetName;
            } else {
                for await (const _row of worksheetReader) { /* drain */ }
            }
        }

        // ✅ UPDATED: Include aopDelHeaderFound in validation
        if (!styleReqHeaderFound && !kwoHeaderFound && !awoHeaderFound && !dwoHeaderFound && !aopDelHeaderFound && !yarnGreyRcvdHeaderFound && !dyeingGreyDeliveryHeaderFound) {
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
            styleRequirement: { sheetName: styleReqSheetName, found: styleReqHeaderFound, totalRows: parsedRows.length },
            kwo: { sheetName: kwoSheetName, found: kwoHeaderFound, totalRows: parsedRowsKWO.length },
            awo: { sheetName: awoSheetName, found: awoHeaderFound, totalRows: parsedRowsAWO.length },
            dwo: { sheetName: dwoSheetName, found: dwoHeaderFound, totalRows: parsedRowsDWO.length },
            // ✅ NEW: Return AOP Delivery parsing summary
            aopDel: { sheetName: aopDelSheetName, found: aopDelHeaderFound, totalRows: parsedRowsAOPDel.length },
            yarnGreyRcvd: { sheetName: yarnGreyRcvdSheetName, found: yarnGreyRcvdHeaderFound, totalRows: parsedRowsYarnGreyRcvd.length },
            dyeingGreyDelivery: { sheetName: dyeingGreyDeliverySheetName, found: dyeingGreyDeliveryHeaderFound, totalRows: parsedRowsDyeingGreyDelivery.length },
        });

        // ── Background: Parallel upload processing ─────────────────
                // ── Background: SEQUENTIAL upload processing (Prevents RAM Crashes) ─────────────────
        (async () => {
            try {
                // 1. Style Requirement
                if (styleReqHeaderFound && parsedRows.length > 0) {
                    await uploadDataFromFile(parsedRows, jobId);
                    console.log(`✅ [${jobId}] Style Requirement done.`);
                    parsedRows = []; // 🧹 Free memory immediately
                }

                // 2. K.W.O
                if (kwoHeaderFound && parsedRowsKWO.length > 0) {
                    await uploadKWODataFromFile(parsedRowsKWO, jobId);
                    console.log(`✅ [${jobId}] K.W.O done.`);
                    parsedRowsKWO = []; // 🧹 Free memory immediately
                }

                // 3. A.W.O
                if (awoHeaderFound && parsedRowsAWO.length > 0) {
                    await uploadAOWDataFromFile(parsedRowsAWO, jobId);
                    console.log(`✅ [${jobId}] A.W.O done.`);
                    parsedRowsAWO = []; // 🧹 Free memory immediately
                }

                // 4. D.W.O
                if (dwoHeaderFound && parsedRowsDWO.length > 0) {
                    await uploadDYEINGDataFromFile(parsedRowsDWO, jobId);
                    console.log(`✅ [${jobId}] D.W.O done.`);
                    parsedRowsDWO = []; // 🧹 Free memory immediately
                }

                // 5. AOP Delivery
                if (aopDelHeaderFound && parsedRowsAOPDel.length > 0) {
                    await uploadAopDeliveryDataFromFile(parsedRowsAOPDel, jobId);
                    console.log(`✅ [${jobId}] AOP DEL. & RCVD done.`);
                    parsedRowsAOPDel = []; // 🧹 Free memory immediately
                }

                // 6. Yarn & Grey Rcvd
                if (yarnGreyRcvdHeaderFound && parsedRowsYarnGreyRcvd.length > 0) {
                    await uploadYarnGreyRcvdDataFromFile(parsedRowsYarnGreyRcvd, jobId);
                    console.log(`✅ [${jobId}] YARN & GREY RCVD done.`);
                    parsedRowsYarnGreyRcvd = []; // 🧹 Free memory immediately
                }

                // 7. Dyeing Grey Delivery
                if (dyeingGreyDeliveryHeaderFound && parsedRowsDyeingGreyDelivery.length > 0) {
                    await uploadDyeingGreyDeliveryDataFromFile(parsedRowsDyeingGreyDelivery, jobId);
                    console.log(`✅ [${jobId}] DYEING GREY DEL. & RCVD done.`);
                    parsedRowsDyeingGreyDelivery = []; // 🧹 Free memory immediately
                }

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