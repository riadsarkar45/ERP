import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

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

interface UploadSummary {
    stylesCreated: number;
    stylesUpdated: number;
    rowsInserted: number;
    rowsSkipped: number;
    errors: { jobNo: string; message: string }[];
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

export const uploadDataFromFile = async (
    rows: ParsedRow[],
    jobId: string
): Promise<UploadSummary> => {
    const summary: UploadSummary = {
        stylesCreated: 0,
        stylesUpdated: 0,
        rowsInserted: 0,
        rowsSkipped: 0,
        errors: [],
    };

    try {
        const groupedByJob = new Map<string, ParsedRow[]>();
        for (const row of rows) {
            if (!row.jobNo) {
                summary.rowsSkipped++;
                continue;
            }
            const jobNo = normalizeJobNo(row.jobNo);
            const bucket = groupedByJob.get(jobNo) ?? [];
            bucket.push(row);
            groupedByJob.set(jobNo, bucket);
        }

        const jobEntries = Array.from(groupedByJob.entries());
        const totalJobs = jobEntries.length;

        emitProgress("style-req-progress", {
            jobId,
            phase: "starting",
            current: 0,
            total: totalJobs,
        });

        for (let i = 0; i < jobEntries.length; i++) {
            const entry = jobEntries[i];
            if (!entry) continue;
            const [jobNo, jobRows] = entry;
            const first = jobRows[0];
            if (!first) continue;

            try {
                const existing = await prisma.styleRequirement.findUnique({
                    where: { jobNo },
                    select: { id: true },
                });

                await prisma.$transaction(async (tx) => {
                    await tx.jobs.upsert({
                        where: { jobNo },
                        update: {},
                        create: { jobNo },
                    });

                    const parent = await tx.styleRequirement.upsert({
                        where: { jobNo },
                        update: {
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            styleNo: first.style,
                            poNo: first.poNo,
                            processLoss: Number(first.processLoss) || 0,
                        },
                        create: {
                            jobNo,
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            styleNo: first.style,
                            poNo: first.poNo,
                            processLoss: Number(first.processLoss) || 0,
                        },
                    });

                    await tx.styleRequirementRow.createMany({
                        data: jobRows.map((row) => ({
                            styleRequirementId: parent.id,
                            color: row.color,
                            composition: row.composition,
                            finishDia: row.finishDia,
                            orderQty: row.orderQty,
                            finishRequiredQty: row.finishFabricRequired,
                            additional: Number(row.additional)
                        })),
                    });
                });

                if (existing) {
                    summary.stylesUpdated++;
                } else {
                    summary.stylesCreated++;
                }
                summary.rowsInserted += jobRows.length;

                emitProgress("style-req-progress", {
                    jobId,
                    phase: "inserting",
                    current: i + 1,
                    total: totalJobs,
                    jobNo,
                    rowsInGroup: jobRows.length,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                summary.errors.push({ jobNo, message });
                console.error(`❌ Failed to upsert job "${jobNo}":`, message);

                emitProgress("style-req-progress", {
                    jobId,
                    phase: "error",
                    current: i + 1,
                    total: totalJobs,
                    jobNo,
                    message,
                });
            }
        }

        emitProgress("style-req-complete", { jobId, summary });
        return summary;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        emitProgress("style-req-error", { jobId, message });
        throw err;
    }
};