import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { Prisma } from "@prisma/client";

// Shape sent by StyleEditModal's buildChangePayload(): an array where each
// entry is ONE job/style that actually changed, containing only the fields
// that changed, plus newRows / updatedRows / deletedRowIds for its
// composition breakdown.

interface UpdatedRowInput {
    id: number | string;
    composition?: string;
    color?: string;
    finishDia?: string;
    orderQty?: number | string;
    finishRequiredQty?: number | string;
    additional?: number | string;
    processLoss: string
}

interface NewRowInput {
    // NOTE: the frontend's buildChangePayload currently leaves a client-side
    // temp id (e.g. "temp-1790157608025-2") on newRows entries — it only
    // strips the `isNew` flag, not `id`. That's harmless here: `id` is
    // intentionally never read for new rows below, since
    // StyleRequirementRow.id is a DB autoincrement and Prisma assigns it.
    id?: number | string;
    composition?: string;
    color?: string;
    finishDia?: string;
    orderQty?: number | string;
    finishRequiredQty?: number | string;
    additional?: number | string;
    processLoss: string
}

interface StyleEditInput {
    id: number | string;
    salesContact?: string;
    buyerName?: string;
    jobNo?: string;
    poNo?: string;
    styleNo?: string;
    processLoss?: number | string; // StyleRequirement.processLoss is Float
    newRows?: NewRowInput[];
    updatedRows?: UpdatedRowInput[];
    deletedRowIds?: (number | string)[];
}

// Plain string fields on StyleRequirement this endpoint allows editing.
// processLoss is handled separately since it needs numeric conversion.
const STYLE_STRING_KEYS = ["salesContact", "buyerName", "jobNo", "poNo", "styleNo"] as const;

const toInt = (raw: unknown): number | null => {
    if (raw === "" || raw == null) return 0;
    const n = Math.round(Number(raw));
    return Number.isNaN(n) ? null : n;
};

const toFloat = (raw: unknown): number | null => {
    if (raw === "" || raw == null) return 0;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
};

// Keep your existing imports and helpers above this function, unchanged:
// Request/Response, prisma, STYLE_STRING_KEYS, toInt, toFloat, StyleEditInput

// Keep your existing imports and helpers above this function, unchanged:
// Request/Response, prisma, STYLE_STRING_KEYS, toInt, toFloat, StyleEditInput

export const editStyleRequirement = async (req: Request, res: Response) => {
    try {
        const payload = req.body as StyleEditInput[];

        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(400).json({ message: "Request body must be a non-empty array of style edits" });
        }

        const results: Array<{
            id: number;
            updated: boolean;
            rowsUpdated: number;
            rowsCreated: number;
            rowsDeleted: number;
        }> = [];

        // Sequential per-style processing — each style's operations run in
        // their own transaction, so one bad entry in the array doesn't roll
        // back edits to jobs that were valid.
        for (const styleEdit of payload) {
            const styleId = Number(styleEdit.id);
            if (!Number.isFinite(styleId)) {
                return res.status(400).json({ message: `Invalid style id: ${styleEdit.id}` });
            }

            const existingStyle = await prisma.styleRequirement.findUnique({
                where: { id: styleId },
                select: { id: true },
            });
            if (!existingStyle) {
                return res.status(404).json({ message: `Style requirement ${styleId} not found` });
            }

            // --- Build the style-level update ---
            const styleData: Record<string, string | number> = {};
            for (const key of STYLE_STRING_KEYS) {
                const val = styleEdit[key];
                if (val !== undefined) styleData[key] = String(val);
            }
            if (styleEdit.processLoss !== undefined) {
                const pl = toFloat(styleEdit.processLoss);
                if (pl !== null) styleData.processLoss = pl;
            }

            const operations: any[] = [];

            if (Object.keys(styleData).length > 0) {
                operations.push(
                    prisma.styleRequirement.update({
                        where: { id: styleId },
                        data: styleData,
                    })
                );
            }

            // --- Deleted rows ---
            // NOTE: Composition has onDelete: Cascade to StyleRequirementRow, so deleting
            // a row also deletes its work order compositions (and their deliveries).
            // Never delete + re-create a row just to change its color/composition,
            // send it in updatedRows instead.
            let deletedIds: number[] = [];
            if (styleEdit.deletedRowIds && styleEdit.deletedRowIds.length > 0) {
                deletedIds = styleEdit.deletedRowIds
                    .map((id) => Number(id))
                    .filter((id) => Number.isFinite(id));
                if (deletedIds.length > 0) {
                    operations.push(
                        prisma.styleRequirementRow.deleteMany({
                            where: {
                                id: { in: deletedIds },
                                styleRequirementId: styleId, // scoped: can't delete another job's row
                            },
                        })
                    );
                }
            }

            // --- Updated existing rows ---
            let rowsUpdatedCount = 0;
            if (styleEdit.updatedRows && styleEdit.updatedRows.length > 0) {
                // Load the current color/composition of the rows being edited, so we know
                // what changed and can find legacy compositions that have no row id yet.
                const updatedRowIds = styleEdit.updatedRows
                    .map((r) => Number(r.id))
                    .filter((id) => Number.isFinite(id));

                const existingRows = await prisma.styleRequirementRow.findMany({
                    where: { id: { in: updatedRowIds }, styleRequirementId: styleId },
                    select: { id: true, color: true, composition: true },
                });
                const existingRowMap = new Map(existingRows.map((r) => [r.id, r]));

                for (const row of styleEdit.updatedRows) {
                    const rowId = Number(row.id);
                    if (!Number.isFinite(rowId)) continue;

                    // Row doesn't exist or belongs to another job -> skip
                    const existing = existingRowMap.get(rowId);
                    if (!existing) continue;

                    const rowData: Record<string, string | number> = {};
                    if (row.composition !== undefined) rowData.composition = String(row.composition);
                    if (row.color !== undefined) rowData.color = String(row.color);
                    if (row.finishDia !== undefined) rowData.finishDia = String(row.finishDia);
                    if (row.processLoss !== undefined) rowData.processLoss = String(row.processLoss);
                    if (row.orderQty !== undefined) {
                        const v = toInt(row.orderQty);
                        if (v !== null) rowData.orderQty = v;
                    }
                    if (row.finishRequiredQty !== undefined) {
                        const v = toFloat(row.finishRequiredQty);
                        if (v !== null) rowData.finishRequiredQty = v;
                    }
                    if (row.additional !== undefined) {
                        const v = toInt(row.additional);
                        if (v !== null) rowData.additional = v;
                    }

                    if (Object.keys(rowData).length === 0) continue;

                    rowsUpdatedCount += 1;
                    operations.push(
                        prisma.styleRequirementRow.updateMany({
                            where: {
                                id: rowId,
                                styleRequirementId: styleId, // scoped: can't edit another job's row
                            },
                            data: rowData,
                        })
                    );

                    // ── Keep work order compositions in sync with the row ──
                    const newColor = rowData.color as string | undefined;
                    const newComposition = rowData.composition as string | undefined;
                    const colorChanged = newColor !== undefined && newColor !== existing.color;
                    const compositionChanged =
                        newComposition !== undefined && newComposition !== existing.composition;

                    if (colorChanged || compositionChanged) {
                        const compositionData: { color?: string; composition?: string } = {};
                        if (colorChanged) compositionData.color = newColor as string;
                        if (compositionChanged) compositionData.composition = newComposition as string;

                        // Primary path: compositions linked by styleRequirementRowId
                        operations.push(
                            prisma.composition.updateMany({
                                where: { styleRequirementRowId: rowId },
                                data: compositionData,
                            })
                        );

                        // Legacy compositions with no row id: match by the OLD text within this style
                        operations.push(
                            prisma.composition.updateMany({
                                where: {
                                    styleRequirementRowId: null,
                                    workOrder: { styleRequirementId: styleId },
                                    composition: existing.composition,
                                    color: existing.color,
                                },
                                data: compositionData,
                            })
                        );
                    }
                }
            }

            // --- Brand-new rows ---
            let rowsCreatedCount = 0;
            if (styleEdit.newRows && styleEdit.newRows.length > 0) {
                for (const row of styleEdit.newRows) {
                    rowsCreatedCount += 1;
                    operations.push(
                        prisma.styleRequirementRow.create({
                            data: {
                                styleRequirementId: styleId,
                                composition: row.composition ? String(row.composition) : "",
                                color: row.color ? String(row.color) : "",
                                finishDia: row.finishDia ? String(row.finishDia) : "",
                                orderQty: toInt(row.orderQty) ?? 0,
                                finishRequiredQty: toFloat(row.finishRequiredQty) ?? 0,
                                additional: toInt(row.additional) ?? 0,
                                ...(row.processLoss !== undefined &&
                                    row.processLoss !== null && { processLoss: String(row.processLoss) }),
                            },
                        })
                    );
                }
            }

            if (operations.length > 0) {
                await prisma.$transaction(operations);
            }

            results.push({
                id: styleId,
                updated: Object.keys(styleData).length > 0,
                rowsUpdated: rowsUpdatedCount,
                rowsCreated: rowsCreatedCount,
                rowsDeleted: deletedIds.length,
            });
        }

        return res.status(200).json({ message: "Style requirement(s) updated", data: results });
    } catch (err) {
        console.error("editStyleRequirement error:", err);
        return res.status(500).json({ message: "Failed to update style requirement(s)" });
    }
};



// Prisma sometimes reports Postgres FK errors as "unknown" (e.g. code 23001), so check both forms
const isFkViolation = (e: unknown): boolean =>
    (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") ||
    (e instanceof Prisma.PrismaClientUnknownRequestError &&
        /23001|23503|foreign key/i.test(e.message))

export const deleteStyleData = async (req: Request, res: Response) => {
    const { compId, deleteType } = req.params
    const id = Number(compId)

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).send({ message: "Invalid id", type: "error" })
    }

    try {
        switch (deleteType) {
            // ---------- delete one composition row ----------
            case "delComp": {
                // Deleting a StyleRequirementRow cascades to its Compositions and their
                // deliveries, so refuse if stock movement has already been recorded.
                const deliveryCount = await prisma.deliveries.count({
                    where: { composition: { styleRequirementRowId: id } },
                })
                if (deliveryCount > 0) {
                    return res.status(409).send({
                        message: `Cannot delete: this composition already has ${deliveryCount} delivery record(s). Remove those first.`,
                        type: "error",
                    })
                }

                await prisma.$transaction(async (tx) => {
                    // reconciliationData would otherwise be left orphaned (its FK is SetNull)
                    await tx.reconciliationData.deleteMany({
                        where: { styleRequirementRowId: id },
                    })
                    await tx.styleRequirementRow.delete({ where: { id } })
                })

                return res
                    .status(200)
                    .send({ message: "Composition deleted successfully", type: "success" })
            }

            // ---------- delete the whole job and everything under it ----------
            case "delWholeJob": {
                const summary = await prisma.$transaction(
                    async (tx) => {
                        const styleReq = await tx.styleRequirement.findUniqueOrThrow({
                            where: { id },
                            select: { id: true, jobNo: true },
                        })

                        // every work order that belongs to this style requirement / job
                        const workOrderFilter: Prisma.WorkOrderWhereInput = {
                            OR: [
                                { styleRequirementId: id },
                                { jobs: { jobNo: styleReq.jobNo } },
                            ],
                        }

                        // count deliveries first (they are removed by cascade below)
                        const deliveryCount = await tx.deliveries.count({
                            where: { composition: { workOrder: workOrderFilter } },
                        })

                        // 1. compositions first: this is what unblocks the RESTRICT.
                        //    Cascades to deliveries and YarnColorBooking.
                        const compositions = await tx.composition.deleteMany({
                            where: { workOrder: workOrderFilter },
                        })

                        // 2. approval requests (FK is SetNull, would be left orphaned)
                        await tx.workOrderApprovalRequest.deleteMany({
                            where: { workOrder: workOrderFilter },
                        })

                        // 3. work orders
                        const workOrders = await tx.workOrder.deleteMany({
                            where: workOrderFilter,
                        })

                        // 4. reconciliation data linked to this job's rows
                        await tx.reconciliationData.deleteMany({
                            where: { styleRequirementRow: { styleRequirementId: id } },
                        })

                        // 5. sizes (sizeWiseCutting first: it restricts deleting sizes)
                        await tx.sizeWiseCutting.deleteMany({
                            where: { size: { styleRequirementId: id } },
                        })
                        await tx.sizes.deleteMany({ where: { styleRequirementId: id } })

                        // 6. style requirement (cascades StyleRequirementRow + reconciliationNotes)
                        await tx.styleRequirement.delete({ where: { id } })

                        // 7. the job itself
                        await tx.jobs.deleteMany({ where: { jobNo: styleReq.jobNo } })

                        return {
                            jobNo: styleReq.jobNo,
                            workOrders: workOrders.count,
                            compositions: compositions.count,
                            deliveries: deliveryCount,
                        }
                    },
                    { timeout: 30000, maxWait: 10000 } // default 5s is too short for Neon + many rows
                )

                return res.status(200).send({
                    message: "Job deleted successfully",
                    type: "success",
                    data: summary,
                })
            }

            default:
                return res.status(400).send({ message: "Invalid delete type", type: "error" })
        }
    } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
            return res.status(404).send({ message: "Record not found", type: "error" })
        }
        if (isFkViolation(e)) {
            return res.status(409).send({
                message: "Cannot delete: this record is still used by other data",
                type: "error",
            })
        }
        console.error("deleteStyleData failed:", e)
        return res.status(500).send({ message: "Internal server error", type: "error" })
    }
}