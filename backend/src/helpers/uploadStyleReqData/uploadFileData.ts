import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

// ── Types ─────────────────────────────────────────────────────────
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

interface UploadSummary {
    stylesCreated: number;
    stylesUpdated: number;
    rowsInserted: number;
    rowsSkipped: number;
    errors: { jobNo: string; message: string }[];
}

// Small helper so every emit site doesn't need its own null-check
const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    console.log(`📡 Emitting '${event}'`, payload);
    io.emit(event, payload);
};

// ── Main ──────────────────────────────────────────────────────────
/**
 * Writes parsed Excel rows into Neon:
 *  - One StyleRequirement per unique `jobNo` (upserted on jobNo)
 *  - One StyleRequirementRow per source row, linked to that StyleRequirement
 *
 * Emits live progress over Socket.IO so the frontend can render a real
 * progress bar instead of a blind spinner:
 *   'upload-progress' — { jobId, current, total, jobNo, rowsInGroup }
 *   'upload-complete' — { jobId, summary }
 *   'upload-error'    — { jobId, message }  (only for total failure)
 *
 * Rows with no `jobNo` value are skipped since StyleRequirementRow
 * requires a parent StyleRequirement to attach to.
 */
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
        // Group rows by jobNo so each job only triggers one upsert,
        // not one per row.
        const groupedByJob = new Map<string, ParsedRow[]>();
        for (const row of rows) {
            if (!row.jobNo) {
                summary.rowsSkipped++;
                continue;
            }
            const bucket = groupedByJob.get(row.jobNo) ?? [];
            bucket.push(row);
            groupedByJob.set(row.jobNo, bucket);
        }

        const jobEntries = Array.from(groupedByJob.entries());
        const totalJobs = jobEntries.length;

        emitProgress("upload-progress", {
            jobId,
            phase: "starting",
            current: 0,
            total: totalJobs,
        });

        for (let i = 0; i < jobEntries.length; i++) {
            const entry = jobEntries[i];
            if (!entry) continue; // guard for potential undefined from indexed access
            const [jobNo, jobRows] = entry;
            const first = jobRows[0];
            if (!first) continue;

            try {
                const existing = await prisma.styleRequirement.findUnique({
                    where: { jobNo },
                    select: { id: true },
                });

                await prisma.$transaction(async (tx) => {
                    const parent = await tx.styleRequirement.upsert({
                        where: { jobNo },
                        update: {
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            styleNo: first.style,
                            poNo: first.poNo,
                        },
                        create: {
                            jobNo,
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            styleNo: first.style,
                            poNo: first.poNo,
                            processLoss: "0",
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
                        })),
                    });
                });

                if (existing) {
                    summary.stylesUpdated++;
                } else {
                    summary.stylesCreated++;
                }
                summary.rowsInserted += jobRows.length;

                emitProgress("upload-progress", {
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

                // Log per-row failures to the console too, not just the socket
                // emit, so they're visible in Render logs even if no client
                // is connected to receive them.
                console.error(`❌ Failed to upsert job "${jobNo}":`, message);

                emitProgress("upload-progress", {
                    jobId,
                    phase: "error",
                    current: i + 1,
                    total: totalJobs,
                    jobNo,
                    message,
                });
            }
        }

        emitProgress("upload-complete", { jobId, summary });
        return summary;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        emitProgress("upload-error", { jobId, message });
        throw err;
    }
};