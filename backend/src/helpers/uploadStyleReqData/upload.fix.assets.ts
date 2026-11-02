import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";
import { Prisma } from "@prisma/client";

/* =========================================================
   TYPES
========================================================= */

export interface FixAssetParsedRow {
    challanNo: string;
    source: string;
    assetType: string;
    category: string;
    description: string;
    assetCode: string;
    assetId: string;
    supplier: string;
    model: string;
    origin: string;
    sku: string;
    openingQty: number;
    additionsQty: number;
    disposedQty: number;
    sentQty: number;
    receivedQty: number;
    from: string;
    to: string;
    remarks: string;
    priceValue: number;
    amount: number;
}

export interface FixAssetSummaryParsedRow {
    source: string;
    assetType: string;
    category: string;
    description: string;
    assetCode: string;
    openingQty: number;
    additionsQty: number;
    disposedQty: number;
    sentQty: number;
    receivedQty: number;
    amount: number;
    remarks: string;
}

interface FixAssetUploadSummary {
    totalRows: number;
    inserted: number;
    skippedDuplicates: number;
    errors: string[];
}

/* =========================================================
   HELPERS
========================================================= */

const emitProgress = (
    event: string,
    payload: Record<string, unknown>
): void => {
    try {
        const io = getIO();
        if (io) io.emit(event, payload);
    } catch (error) {
        console.error("[FIX ASSET] Socket.IO emit failed:", error);
    }
};

const createEmptySummary = (totalRows: number): FixAssetUploadSummary => ({
    totalRows,
    inserted: 0,
    skippedDuplicates: 0,
    errors: [],
});

const safeString = (value: unknown): string => {
    if (value === null || value === undefined) return "NULL";
    const result = String(value).trim();
    return result || "NULL";
};

const safeNumber = (value: unknown): number => {
    if (value === null || value === undefined || value === "") return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const safeInteger = (value: unknown): number => Math.trunc(safeNumber(value));

type FixAssetCreateManyInput = Prisma.fixAssetCreateManyInput;

/**
 * Shared batched insertion for Movement and SUMMARY records.
 * skipDuplicates only skips records protected by a database unique constraint.
 */
const insertFixAssetRecords = async (
    data: FixAssetCreateManyInput[],
    jobId: string,
    summary: FixAssetUploadSummary
): Promise<FixAssetUploadSummary> => {
    const batchSize = 100;

    if (data.length === 0) {
        emitProgress("fix-asset-complete", { jobId, summary });
        return summary;
    }

    emitProgress("fix-asset-progress", {
        jobId,
        phase: "bulk_processing",
        current: 0,
        total: data.length,
    });

    for (let offset = 0; offset < data.length; offset += batchSize) {
        const batch = data.slice(offset, offset + batchSize);

        try {
            const result = await prisma.fixAsset.createMany({
                data: batch,
                skipDuplicates: true,
            });

            summary.inserted += result.count;
            summary.skippedDuplicates += batch.length - result.count;
        } catch (error: unknown) {
            const message =
                error instanceof Error ? error.message : String(error);

            console.error(
                `[${jobId}] Fix Asset batch insert failed; trying row-by-row:`,
                message
            );

            for (const item of batch) {
                try {
                    await prisma.fixAsset.create({ data: item });
                    summary.inserted++;
                } catch (rowError: unknown) {
                    const dbError = rowError as {
                        code?: string;
                        message?: string;
                    };

                    if (dbError.code === "P2002") {
                        summary.skippedDuplicates++;
                    } else {
                        const rowMessage =
                            dbError.message ||
                            (rowError instanceof Error
                                ? rowError.message
                                : String(rowError));

                        summary.errors.push(rowMessage);
                        console.error(
                            `[${jobId}] Fix Asset row insert failed:`,
                            rowMessage
                        );
                    }
                }
            }
        }

        emitProgress("fix-asset-progress", {
            jobId,
            phase: "inserting",
            current: Math.min(offset + batchSize, data.length),
            total: data.length,
            inserted: summary.inserted,
            skippedDuplicates: summary.skippedDuplicates,
            errorCount: summary.errors.length,
        });
    }

    emitProgress("fix-asset-complete", { jobId, summary });
    return summary;
};

/* =========================================================
   FIX ASSET MOVEMENT IMPORTER
========================================================= */

export const uploadFixAssetDataFromFile = async (
    rows: FixAssetParsedRow[],
    jobId: string,
    userId: number,
    workingStation: string
): Promise<FixAssetUploadSummary> => {
    const summary = createEmptySummary(rows?.length || 0);

    if (!rows?.length) {
        emitProgress("fix-asset-complete", { jobId, summary });
        return summary;
    }

    const data: FixAssetCreateManyInput[] = rows.map((row) => ({
        additionsQty: safeInteger(row.additionsQty),
        amount: safeNumber(row.amount),
        assetCode: safeString(row.assetCode),
        assetId: safeString(row.assetId),
        assetType: safeString(row.assetType),
        category: safeString(row.category),
        challanNo: safeString(row.challanNo),
        description: safeString(row.description),
        destination: safeString(row.to),
        disposedQty: safeInteger(row.disposedQty),
        factoryName: safeString(row.source),
        from: safeString(row.from),
        model: safeString(row.model),
        openingQty: safeInteger(row.openingQty),
        origin: safeString(row.origin),
        priceValue: safeNumber(row.priceValue),
        receivedQty: safeInteger(row.receivedQty),
        remarks: safeString(row.remarks),
        sentQty: safeInteger(row.sentQty),
        sku: safeString(row.sku),
        source: safeString(row.source),
        supplier: safeString(row.supplier),
        createdBy: userId,
        workingStation: safeString(workingStation),
        to: safeString(row.to),
    }));

    const result = await insertFixAssetRecords(data, jobId, summary);

    console.log(
        `[${jobId}] Fix Asset Movement complete: ` +
        `${result.inserted} inserted, ` +
        `${result.skippedDuplicates} duplicates, ` +
        `${result.errors.length} errors`
    );

    return result;
};

/* =========================================================
   FIX ASSET SUMMARY IMPORTER
========================================================= */

export const uploadFixAssetSummaryDataFromFile = async (
    rows: FixAssetSummaryParsedRow[],
    jobId: string,
    userId: number,
    workingStation: string
): Promise<FixAssetUploadSummary> => {
    const summary = createEmptySummary(rows?.length || 0);

    if (!rows?.length) {
        emitProgress("fix-asset-complete", { jobId, summary });
        return summary;
    }

    const data: FixAssetCreateManyInput[] = rows.map((row) => ({
        // Direct mappings from the SUMMARY worksheet.
        source: safeString(row.source),
        assetType: safeString(row.assetType),
        category: safeString(row.category),
        description: safeString(row.description),
        assetCode: safeString(row.assetCode),

        openingQty: safeInteger(row.openingQty),
        additionsQty: safeInteger(row.additionsQty),
        disposedQty: safeInteger(row.disposedQty),
        sentQty: safeInteger(row.sentQty),
        receivedQty: safeInteger(row.receivedQty),

        // Excel "TOTAL VALUE (TAKA)" maps to Prisma amount.
        amount: safeNumber(row.amount),

        remarks: safeString(row.remarks),

        // SUMMARY does not provide Movement-specific fields.
        assetId: "NULL",
        challanNo: "NULL",
        destination: "NULL",
        factoryName: "NULL",
        from: "NULL",
        model: "NULL",
        origin: "NULL",
        priceValue: 0,
        sku: "NULL",
        supplier: "NULL",
        to: "NULL",

        createdBy: userId,
        workingStation: safeString(workingStation),
    }));

    const result = await insertFixAssetRecords(data, jobId, summary);

    console.log(
        `[${jobId}] Fix Asset SUMMARY complete: ` +
        `${result.inserted} inserted, ` +
        `${result.skippedDuplicates} duplicates, ` +
        `${result.errors.length} errors`
    );

    return result;
};
