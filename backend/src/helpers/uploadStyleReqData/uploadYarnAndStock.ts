import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

// ==========================================
// Interfaces matching your Excel columns
// ==========================================
export interface YarnStockParsedRow {
    supplierName: string;
    count: string;
    composition: string;
    lotNo: string;
    physicalBalanceQty: string;
}

export interface YdStockParsedRow {
    count: string;
    composition: string;
    buyer: string;
    jobNo: string;
    styleNo: string;
    color: string;
    dyedYarnLot: string;
    yarnDyedStock: string;
}

interface UploadSummary {
    yarnStockInserted: number;
    yarnStockSkipped: number;
    ydStockInserted: number;
    ydStockSkipped: number;
    errors: { rowIndex: number; tableName: string; message: string }[];
}

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    io.emit(event, payload);
};

export const uploadYarnAndYdStockData = async (
    yarnStockRows: YarnStockParsedRow[],
    ydStockRows: YdStockParsedRow[],
    jobId: string,
    createdBy: number
): Promise<UploadSummary> => {
    const summary: UploadSummary = {
        yarnStockInserted: 0,
        yarnStockSkipped: 0,
        ydStockInserted: 0,
        ydStockSkipped: 0,
        errors: [],
    };

    console.log(`📊 Yarn/YD Import: Received ${yarnStockRows.length} Yarn Stock rows and ${ydStockRows.length} YD Stock rows`);

    try {
        // ==========================================
        // 1. Process Yarn Stock
        // ==========================================
        if (yarnStockRows.length > 0) {
            emitProgress("yarn-stock-progress", {
                jobId,
                phase: "starting",
                current: 0,
                total: yarnStockRows.length,
            });

            const validYarnRows = yarnStockRows.filter((row, index) => {
                const supplier = row.supplierName?.trim();
                const count = row.count?.trim();
                
                // Skip empty rows or "N/A" placeholders often found in Excel exports
                if (!supplier || !count || supplier.toLowerCase() === 'n/a' || count.toLowerCase() === 'n/a') {
                    summary.yarnStockSkipped++;
                    summary.errors.push({ rowIndex: index + 1, tableName: "Yarn Stock", message: "Missing or invalid supplierName or count" });
                    return false;
                }
                return true;
            });

            console.log(`✅ Yarn Stock: ${validYarnRows.length} valid rows after filtering`);

            // ⚠️ OPTIONAL: Uncomment the line below if you want to CLEAR existing data before inserting (Overwrite mode)
            // await prisma.yarnStock.deleteMany({});

            const yarnResult = await prisma.yarnStock.createMany({
                data: validYarnRows.map(row => ({
                    supplierName: row.supplierName.trim(),
                    count: row.count.trim(),
                    composition: row.composition ? row.composition.trim() : "",
                    lotNo: row.lotNo ? row.lotNo.trim() : "",
                    physicalBalanceQty: row.physicalBalanceQty ? Number(row.physicalBalanceQty) : 0,
                    createdBy: createdBy,
                })),
            });

            summary.yarnStockInserted = yarnResult.count;
            console.log(`✅ Yarn Stock: Successfully inserted ${yarnResult.count} rows`);

            emitProgress("yarn-stock-progress", {
                jobId,
                phase: "complete",
                current: yarnResult.count,
                total: yarnStockRows.length,
            });
        }

        // ==========================================
        // 2. Process YD Stock
        // ==========================================
        if (ydStockRows.length > 0) {
            emitProgress("yd-stock-progress", {
                jobId,
                phase: "starting",
                current: 0,
                total: ydStockRows.length,
            });

            const validYdRows = ydStockRows.filter((row, index) => {
                const count = row.count?.trim();
                const buyer = row.buyer?.trim();
                
                if (!count || !buyer || count.toLowerCase() === 'n/a' || buyer.toLowerCase() === 'n/a') {
                    summary.ydStockSkipped++;
                    summary.errors.push({ rowIndex: index + 1, tableName: "YD Stock", message: "Missing or invalid count or buyer" });
                    return false;
                }
                return true;
            });

            console.log(`✅ YD Stock: ${validYdRows.length} valid rows after filtering`);


            const ydResult = await prisma.ydStock.createMany({
                data: validYdRows.map(row => ({
                    count: row.count.trim(),
                    composition: row.composition ? row.composition.trim() : "",
                    buyer: row.buyer.trim(),
                    jobNo: row.jobNo ? row.jobNo.trim() : "",
                    styleNo: row.styleNo ? row.styleNo.trim() : "",
                    color: row.color ? row.color.trim() : "",
                    dyedYarnLot: row.dyedYarnLot ? row.dyedYarnLot.trim() : "",
                    yarnDyedStock: row.yarnDyedStock ? String(row.yarnDyedStock).trim() : "0",
                })),
            });

            summary.ydStockInserted = ydResult.count;
            console.log(`✅ YD Stock: Successfully inserted ${ydResult.count} rows`);

            emitProgress("yd-stock-progress", {
                jobId,
                phase: "complete",
                current: ydResult.count,
                total: ydStockRows.length,
            });
        }

        emitProgress("yarn-yd-stock-complete", { jobId, summary });
        return summary;

    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`❌ Failed to upload yarn/yd stock data:`, message);
        emitProgress("yarn-yd-stock-error", { jobId, message });
        throw err;
    }
};