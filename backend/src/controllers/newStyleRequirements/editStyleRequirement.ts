import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

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

export const editStyleRequirement = async (req: Request, res: Response) => {
    try {
        const payload = req.body as StyleEditInput[];

        if (!Array.isArray(payload) || payload.length === 0) {
            return res.status(400).json({ message: "Request body must be a non-empty array of style edits" });
        }

        const results: Array<{ id: number; updated: boolean; rowsUpdated: number; rowsCreated: number; rowsDeleted: number }> = [];

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
                for (const row of styleEdit.updatedRows) {
                    const rowId = Number(row.id);
                    if (!Number.isFinite(rowId)) continue;

                    const rowData: Record<string, string | number> = {};
                    if (row.composition !== undefined) rowData.composition = String(row.composition);
                    if (row.color !== undefined) rowData.color = String(row.color);
                    if (row.finishDia !== undefined) rowData.finishDia = String(row.finishDia);
                    if (row.processLoss !== undefined) rowData.processLoss = String(row.processLoss);
                    if (row.additional !== undefined) rowData.additional = Number(row.additional);
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

                    if (Object.keys(rowData).length > 0) {
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
                                processLoss: row.processLoss,
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

export const deleteStyleData = async (req: Request, res: Response) => {
    const { compId, deleteType } = req.params as { compId: string, deleteType: string }
    if (!compId || !deleteType) {
        return res.status(404).send({ message: "Required missing field", type: "error" })
    }

    try {
        if (deleteType === "delComp") {
            const findComp = await prisma.styleRequirementRow.findUnique(
                {
                    where: { id: Number(compId) },
                    select: {
                        id: true
                    }
                }

            )
            if (!findComp) {
                return res.status(404).send({ message: "No composition id found", type: "error" })
            }

            const deleteComp = await prisma.styleRequirementRow.delete(
                {
                    where: { id: Number(findComp.id) }
                }
            )

            if (!deleteComp) {
                return res.status(400).send({ message: "Composition delete failed", type: "error" })
            }

            return res.status(200).send({ message: "Composition delete successful", type: "success" })
        }

        if (deleteType === "delWholeJob") {
            const findComp = await prisma.styleRequirement.findUnique(
                {
                    where: { id: Number(compId) },
                    select: {
                        id: true,
                        jobNo: true
                    }
                }

            )
            console.log(findComp, "findComp");
            if (!findComp) {
                return res.status(404).send({ message: "No composition id found", type: "error" })
            }

            const deleteComp = await prisma.styleRequirement.delete(
                {
                    where: { id: Number(findComp.id) }
                }
            )
            const deleteJob = await prisma.jobs.delete(
                {
                    where: { jobNo: findComp.jobNo }
                }
            )

            if (!deleteComp && deleteJob) {
                return res.status(400).send({ message: "Composition delete failed", type: "error" })
            }

            return res.status(200).send({ message: "Composition delete successful", type: "success" })
        }
    }catch(e){
        console.log(e);
    }
}