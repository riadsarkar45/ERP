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
    errors: { style: string; message: string }[];
}

// Small helper so every emit site doesn't need its own null-check
const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    console.log(`📡 Emitting `);
    io.emit(event, payload);
};

// ── Main ──────────────────────────────────────────────────────────
/**
 * Writes parsed Excel rows into Neon:
 *  - One StyleRequirement per unique `style` (upserted on styleNo)
 *  - One StyleRequirementRow per source row, linked to that StyleRequirement
 *
 * Emits live progress over Socket.IO so the frontend can render a real
 * progress bar instead of a blind spinner:
 *   'upload-progress' — { jobId, current, total, styleNo, rowsInGroup }
 *   'upload-complete' — { jobId, summary }
 *   'upload-error'    — { jobId, message }  (only for total failure)
 *
 * Rows with no `style` value are skipped since StyleRequirementRow
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
        // Group rows by styleNo so each style only triggers one upsert,
        // not one per row.
        const groupedByStyle = new Map<string, ParsedRow[]>();
        for (const row of rows) {
            if (!row.style) {
                summary.rowsSkipped++;
                continue;
            }
            const bucket = groupedByStyle.get(row.style) ?? [];
            bucket.push(row);
            groupedByStyle.set(row.style, bucket);
        }

        const styleEntries = Array.from(groupedByStyle.entries());
        const totalStyles = styleEntries.length;

        emitProgress("upload-progress", {
            jobId,
            phase: "starting",
            current: 0,
            total: totalStyles,
        });

        for (let i = 0; i < styleEntries.length; i++) {
            const entry = styleEntries[i];
            if (!entry) continue; // guard for potential undefined from indexed access
            const [styleNo, styleRows] = entry;
            const first = styleRows[0];
            if (!first) continue;

            try {
                const existing = await prisma.styleRequirement.findUnique({
                    where: { styleNo },
                    select: { id: true },
                });

                await prisma.$transaction(async (tx) => {
                    const parent = await tx.styleRequirement.upsert({
                        where: { styleNo },
                        update: {
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            jobNo: first.jobNo,
                            poNo: first.poNo,
                        },
                        create: {
                            styleNo,
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            jobNo: first.jobNo,
                            poNo: first.poNo,
                            processLoss: "0",
                        },
                    });

                    await tx.styleRequirementRow.createMany({
                        data: styleRows.map((row) => ({
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
                summary.rowsInserted += styleRows.length;

                emitProgress("upload-progress", {
                    jobId,
                    phase: "inserting",
                    current: i + 1,
                    total: totalStyles,
                    styleNo,
                    rowsInGroup: styleRows.length,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                summary.errors.push({ style: styleNo, message });

                emitProgress("upload-progress", {
                    jobId,
                    phase: "error",
                    current: i + 1,
                    total: totalStyles,
                    styleNo,
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