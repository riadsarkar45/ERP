import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

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

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    io.emit(event, payload);
};

const normalizeJobNo = (jobNo: string): string => jobNo.trim().replace(/\//g, "-");

export const uploadKWODataFromFile = async (
    rows: KWOParsedRow[],
    jobId: string
) => {
    const summary = {
        workOrdersCreated: 0,
        workOrdersUpdated: 0,
        compositionsInserted: 0,
        rowsSkipped: 0,
        errors: [] as { workOrderNo: string; message: string }[],
    };

    try {
        const groupedByWO = new Map<string, KWOParsedRow[]>();
        for (const row of rows) {
            if (!row.workOrderNo) {
                summary.rowsSkipped++;
                continue;
            }
            const woNo = row.workOrderNo.trim();
            const bucket = groupedByWO.get(woNo) ?? [];
            bucket.push(row);
            groupedByWO.set(woNo, bucket);
        }

        const woEntries = Array.from(groupedByWO.entries());
        const totalWOs = woEntries.length;

        emitProgress("kwo-progress", { jobId, phase: "starting", current: 0, total: totalWOs });

        for (let i = 0; i < woEntries.length; i++) {
            const entry = woEntries[i];
            if (!entry) continue;
            const [workOrderNo, woRows] = entry;
            const first = woRows[0];
            if (!first) continue;

            const normalizedJobNo = normalizeJobNo(first.jobNo);

            try {
                const styleReq = await prisma.styleRequirement.findUnique({
                    where: { jobNo: normalizedJobNo },
                    select: { id: true, jobNo: true },
                });

                if (!styleReq) {
                    const msg = `StyleRequirement not found for jobNo "${normalizedJobNo}". Upload Style Requirement sheet first.`;
                    summary.errors.push({ workOrderNo, message: msg });
                    console.error(`❌ ${msg}`);
                    emitProgress("kwo-progress", {
                        jobId, phase: "error", current: i + 1, total: totalWOs, workOrderNo, message: msg
                    });
                    continue;
                }

                const jobRecord = await prisma.jobs.findUnique({
                    where: { jobNo: normalizedJobNo },
                    select: { id: true },
                });

                if (!jobRecord) {
                    const msg = `jobs record not found for jobNo "${normalizedJobNo}". Upload Style Requirement sheet first.`;
                    summary.errors.push({ workOrderNo, message: msg });
                    console.error(`❌ ${msg}`);
                    emitProgress("kwo-progress", {
                        jobId, phase: "error", current: i + 1, total: totalWOs, workOrderNo, message: msg
                    });
                    continue;
                }

                const existingWO = await prisma.workOrder.findFirst({
                    where: { workOrderNo },
                    orderBy: { id: 'desc' }
                });

                let workOrderId: number;

                await prisma.$transaction(async (tx) => {
                    if (existingWO) {
                        await tx.workOrder.update({
                            where: { id: existingWO.id },
                            data: {
                                workOrderPlaceDate: first.workOrderDate || existingWO.workOrderPlaceDate,
                                month: first.month || existingWO.month,
                                styleNo: first.style || existingWO.styleNo,
                                lotNo: first.poNo || existingWO.lotNo,
                                jobNo: first.jobNo || existingWO.jobNo,
                                orderType: "KWO",
                                factoryName: first.knittingFactoryName || existingWO.factoryName,
                                styleRequirementId: styleReq.id,
                                jobId: jobRecord.id,
                            }
                        });
                        workOrderId = existingWO.id;
                        summary.workOrdersUpdated++;
                    } else {
                        const newWO = await tx.workOrder.create({
                            data: {
                                workOrderNo,
                                workOrderPlaceDate: first.workOrderDate,
                                month: first.month,
                                styleNo: first.style,
                                lotNo: first.poNo,
                                jobNo: first.jobNo,
                                orderType: "KWO",
                                factoryName: first.knittingFactoryName,
                                styleRequirementId: styleReq.id,
                                jobId: jobRecord.id,
                            }
                        });
                        workOrderId = newWO.id;
                        summary.workOrdersCreated++;
                    }

                    const compositionsData = woRows.map(row => ({
                        composition: row.composition || "N/A",
                        unitePrice: row.knittingPricePerKg || 0,
                        color: row.color || "N/A",
                        additional: 0,
                        orderQty: row.knittingWorkOrderQty || 0,
                        workOrderQty: row.knittingWorkOrderQty || 0,
                        workOrderId: workOrderId,
                        orderType: "KWO"
                    }));

                    await tx.composition.createMany({ data: compositionsData });
                    summary.compositionsInserted += compositionsData.length;
                });

                emitProgress("kwo-progress", {
                    jobId, phase: "inserting", current: i + 1, total: totalWOs, workOrderNo, rowsInGroup: woRows.length
                });

            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                summary.errors.push({ workOrderNo, message });
                console.error(`❌ Failed to upsert KWO "${workOrderNo}":`, message);
                
                emitProgress("kwo-progress", {
                    jobId, phase: "error", current: i + 1, total: totalWOs, workOrderNo, message
                });
            }
        }

        emitProgress("kwo-complete", { jobId, summary });
        return summary;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        emitProgress("kwo-error", { jobId, message });
        throw err;
    }
};