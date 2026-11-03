import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

// ... [Keep all your Types and Helpers exactly as they were] ...

interface DeliveryRow { deliveryQty: number; deliveryType: string; }
interface CompositionRow { workOrderQty: number; orderType: string; deliveries: DeliveryRow[]; }
interface WorkOrderRow { id: number; factoryName: string; jobNo: string; compositions: CompositionRow[]; }
type DeliveryTypeTotals = Record<string, number>;
interface FactoryRow { factoryName: string; workOrderQty: number; deliveryTypeTotals: DeliveryTypeTotals; }
interface JobReportNode { jobNo: string; totalWorkOrderQty: number; deliveryTypeTotals: DeliveryTypeTotals; dyeingRows: FactoryRow[]; }
interface BalanceGlanceReport { deliveryTypes: string[]; jobs: JobReportNode[]; }

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const addToTotals = (totals: DeliveryTypeTotals, type: string, qty: number, seenTypes: Set<string>): void => {
    const key = type?.trim() || "Unspecified";
    seenTypes.add(key);
    totals[key] = round2((totals[key] ?? 0) + qty);
};

function processWorkOrderChunk(chunk: WorkOrderRow[], jobMap: Map<string, JobReportNode>, factoryRowMap: Map<string, FactoryRow>, seenTypes: Set<string>): void {
    for (const wo of chunk) {
        let job = jobMap.get(wo.jobNo);
        if (!job) {
            job = { jobNo: wo.jobNo, totalWorkOrderQty: 0, deliveryTypeTotals: {}, dyeingRows: [] };
            jobMap.set(wo.jobNo, job);
        }
        const rowKey = `${wo.jobNo}::${wo.factoryName}`;
        let factoryRow = factoryRowMap.get(rowKey);
        if (!factoryRow) {
            factoryRow = { factoryName: wo.factoryName, workOrderQty: 0, deliveryTypeTotals: {} };
            factoryRowMap.set(rowKey, factoryRow);
            job.dyeingRows.push(factoryRow);
        }
        for (const comp of wo.compositions ?? []) {
            factoryRow.workOrderQty = round2(factoryRow.workOrderQty + comp.workOrderQty);
            job.totalWorkOrderQty = round2(job.totalWorkOrderQty + comp.workOrderQty);
            for (const d of comp.deliveries ?? []) {
                addToTotals(factoryRow.deliveryTypeTotals, d.deliveryType, d.deliveryQty, seenTypes);
                addToTotals(job.deliveryTypeTotals, d.deliveryType, d.deliveryQty, seenTypes);
            }
        }
    }
}

export const balanceGlanceReport = async (req: Request, res: Response) => {
    try {
        const io = getIO();
        const requestId = (req.query?.requestId as string) || (req.body?.requestId as string) || `req_fallback_${Date.now()}`;


        const emitProgress = (percentage: number, message: string) => {
            if (io) {
                io.to(requestId).emit("reportProgress", { percentage, message });
                console.log(`📡 [Backend] Emitted ${percentage}% to room ${requestId}: ${message}`);
            }
        };

        emitProgress(5, "Counting total records...");
        const totalCount = await prisma.workOrder.count();

        if (totalCount === 0) {
            emitProgress(100, "Complete");
            return res.status(200).json({ deliveryTypes: [], jobs: [] });
        }

        const chunkSize = 500;
        const jobMap = new Map<string, JobReportNode>();
        const factoryRowMap = new Map<string, FactoryRow>();
        const seenTypes = new Set<string>();

        emitProgress(10, "Starting data fetch...");

        for (let skip = 0; skip < totalCount; skip += chunkSize) {
            const chunk = await prisma.workOrder.findMany({
                skip,
                take: chunkSize,
                where: { isCancelled: false },
                select: {
                    id: true, factoryName: true, jobNo: true,
                    compositions: {
                        select: {
                            workOrderQty: true, orderType: true,
                            deliveries: { select: { deliveryQty: true, deliveryType: true } }
                        }
                    }
                }
            });

            processWorkOrderChunk(chunk, jobMap, factoryRowMap, seenTypes);

            const currentProcessed = skip + chunk.length;
            const percentage = Math.min(95, Math.round((currentProcessed / totalCount) * 85) + 10);
            emitProgress(percentage, `Processed ${currentProcessed} of ${totalCount} records...`);
        }

        emitProgress(98, "Finalizing report structure...");

        const report: BalanceGlanceReport = {
            deliveryTypes: Array.from(seenTypes).sort((a, b) => a.localeCompare(b)),
            jobs: Array.from(jobMap.values()),
        };

        emitProgress(100, "Complete");
        console.log(`✅ [Backend] Report generation complete for requestId: ${requestId}`);

        res.status(200).json(report);
    } catch (e) {
        console.error("❌ [Backend] Error in balanceGlanceReport:", e);
        const io = getIO();
        const requestId = (req.query?.requestId as string) || (req.body?.requestId as string) || "";
        if (requestId && io) {
            io.to(requestId).emit("reportProgress", { percentage: 100, message: "Error occurred", error: true });
        }
        res.status(500).json({ message: "Something went wrong" });
    }
};