import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../../database/prismaClient/prisma";
import { evaluateQtyExpression } from "./evaluateQtyExpression";

interface UpdateStyleReqBody {
    salesContact?: string;
    buyerName?: string;
    styleNo?: string;
    poNo?: string;
    jobNo?: string | number;
    changedTable?: string;
    composition?: string;
    finishDia?: string;
    orderQty?: string | number;
    rowId?: number | string;
    color?: string;
    additional?: string | number | null;
    finishRequiredQty?: number | string;
}

/** Converts string/number input to a trimmed string. Returns undefined for undefined/null. */
const toTrimmedString = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    return String(value).trim();
};

export const updateStyleReq = async (req: Request, res: Response) => {
    const {
        salesContact,
        buyerName,
        styleNo,
        additional,
        rowId,
        poNo,
        jobNo,
        changedTable,
        finishRequiredQty,
        composition,
        finishDia,
        orderQty,
        color,
    } = req.body as UpdateStyleReqBody;

    const { jobId } = req.params as { jobId: string };
    console.log(req.body);

    try {
        // ─────────────────────────────────────────────────────────────
        // Edits to styleRequirementRow fields (color, composition, dia, qty)
        // ─────────────────────────────────────────────────────────────
        if (changedTable === "styleRequirementRows") {
            const rowIdNum = Number(rowId);
            if (!rowId || isNaN(rowIdNum)) {
                return res.status(400).send({ message: "rowId is required", type: "error" });
            }

            const existingRow = await prisma.styleRequirementRow.findUnique({
                where: { id: rowIdNum },
                select: { id: true, styleRequirementId: true, composition: true, color: true },
            });

            if (!existingRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            const evaluatedOrderQty =
                orderQty !== undefined && orderQty !== null ? evaluateQtyExpression(String(orderQty)) : null;
            const evaluatedFinishRequiredQty =
                finishRequiredQty !== undefined && finishRequiredQty !== null
                    ? evaluateQtyExpression(String(finishRequiredQty))
                    : null;

            const ops: Prisma.PrismaPromise<any>[] = [
                prisma.styleRequirementRow.update({
                    where: { id: existingRow.id },
                    data: {
                        ...(composition !== undefined && { composition }),
                        ...(finishDia !== undefined && { finishDia }),
                        ...(evaluatedOrderQty !== null && { orderQty: evaluatedOrderQty }),
                        ...(color !== undefined && { color: color }),
                        ...(evaluatedFinishRequiredQty !== null && { finishRequiredQty: evaluatedFinishRequiredQty }),
                    },
                }),
            ];

            if (composition !== undefined || color !== undefined) {
                // Primary path: Compositions explicitly linked via styleRequirementRowId
                ops.push(
                    prisma.composition.updateMany({
                        where: { styleRequirementRowId: existingRow.id },
                        data: {
                            ...(composition !== undefined && { composition }),
                            ...(color !== undefined && { color }),
                        },
                    })
                );

                // Fallback for legacy rows created before the FK existed:
                // match by old composition+color string within the same style.
                ops.push(
                    prisma.composition.updateMany({
                        where: {
                            styleRequirementRowId: null,
                            workOrder: { styleRequirementId: existingRow.styleRequirementId },
                            composition: existingRow.composition,
                            color: existingRow.color,
                        },
                        data: {
                            ...(composition !== undefined && { composition }),
                            ...(color !== undefined && { color }),
                        },
                    })
                );
            }

            await prisma.$transaction(ops);

            return res.status(200).send({ message: "Update Successful", type: "success" });
        }

        // ─────────────────────────────────────────────────────────────
        // Additional booking edit
        // ─────────────────────────────────────────────────────────────
        if (changedTable === "compositionAdd") {
            const rowIdNum = Number(rowId);
            if (!rowId || isNaN(rowIdNum)) {
                return res.status(400).send({ message: "rowId is required", type: "error" });
            }

            // Accept number or string; null/undefined means missing.
            const additionalStr = toTrimmedString(additional);
            if (additionalStr === undefined) {
                return res.status(400).send({ message: "A valid additional value is required", type: "error" });
            }

            // Empty string clears the value (0). Unparseable values are rejected.
            const additionalNum = additionalStr === "" ? 0 : evaluateQtyExpression(additionalStr);
            if (additionalNum === null || additionalNum === undefined || isNaN(additionalNum)) {
                return res.status(400).send({ message: "A valid additional value is required", type: "error" });
            }

            const targetRow = await prisma.styleRequirementRow.findUnique({
                where: { id: rowIdNum },
                select: { styleRequirementId: true, composition: true, color: true },
            });

            if (!targetRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            const parentStyleReq = await prisma.styleRequirement.findUnique({
                where: { id: targetRow.styleRequirementId },
                select: { jobNo: true },
            });
            const parentJobNo = parentStyleReq?.jobNo?.trim() ?? "";

            // Use the jobNo from the request, otherwise the row's own job.
            // Never falls back to "all jobs".
            const jobNoTrimmed = toTrimmedString(jobNo) || parentJobNo;
            if (!jobNoTrimmed) {
                return res.status(400).send({ message: "jobNo is required", type: "error" });
            }

            const ops: Prisma.PrismaPromise<any>[] = [
                // Per-job value on compositions (may match 0 rows if no work orders exist yet)
                prisma.composition.updateMany({
                    where: {
                        styleRequirementRowId: rowIdNum,
                        workOrder: {
                            styleRequirementId: targetRow.styleRequirementId,
                            jobNo: jobNoTrimmed,
                        },
                    },
                    data: { additional: additionalNum },
                }),
                // Legacy compositions created before the FK existed
                prisma.composition.updateMany({
                    where: {
                        styleRequirementRowId: null,
                        workOrder: {
                            styleRequirementId: targetRow.styleRequirementId,
                            jobNo: jobNoTrimmed,
                        },
                        composition: targetRow.composition,
                        color: targetRow.color,
                    },
                    data: { additional: additionalNum },
                }),
            ];

            // The summary table displays additional from the styleRequirementRow.
            // Only write it when this is the style requirement's own job, so the
            // value of other jobs is never overwritten.
            const updateRowAdditional = jobNoTrimmed === parentJobNo;
            if (updateRowAdditional) {
                ops.push(
                    prisma.styleRequirementRow.update({
                        where: { id: rowIdNum },
                        data: { additional: additionalNum },
                    })
                );
            }

            const results = await prisma.$transaction(ops);

            console.log(
                `compositionAdd job=${jobNoTrimmed} row=${rowIdNum}: linked=${results[0].count}, legacy=${results[1].count}, rowUpdated=${updateRowAdditional}`
            );

            return res.status(200).send({ message: "Update Successful", type: "success" });
        }

        // ─────────────────────────────────────────────────────────────
        // styleRequirement parent fields (salesContact, buyer, style, po, jobNo)
        // ─────────────────────────────────────────────────────────────
        const jobIdToNumber = Number(jobId);
        if (isNaN(jobIdToNumber)) {
            return res.status(400).send({ message: "Invalid jobId", type: "error" });
        }

        const existingStyleReq = await prisma.styleRequirement.findUnique({
            where: { id: jobIdToNumber },
            select: { id: true, jobNo: true },
        });

        if (!existingStyleReq) {
            return res.status(404).send({ message: "Style Requirement not found", type: "error" });
        }

        const newJobNo = toTrimmedString(jobNo);

        const transactionOps: Prisma.PrismaPromise<any>[] = [
            prisma.styleRequirement.update({
                where: { id: jobIdToNumber },
                data: {
                    ...(salesContact !== undefined && { salesContact }),
                    ...(buyerName !== undefined && { buyerName }),
                    ...(styleNo !== undefined && { styleNo }),
                    ...(newJobNo !== undefined && { jobNo: newJobNo }),
                    ...(poNo !== undefined && { poNo }),
                },
            }),
        ];

        if (newJobNo && newJobNo !== existingStyleReq.jobNo) {
            // Cascade the new jobNo to this style requirement's work orders
            transactionOps.push(
                prisma.workOrder.updateMany({
                    where: {
                        styleRequirementId: jobIdToNumber,
                        jobNo: existingStyleReq.jobNo,
                    },
                    data: { jobNo: newJobNo },
                })
            );

            const existingJob = await prisma.jobs.findUnique({
                where: { jobNo: existingStyleReq.jobNo },
                select: { id: true },
            });
            if (existingJob) {
                transactionOps.push(
                    prisma.jobs.update({
                        where: { id: existingJob.id },
                        data: { jobNo: newJobNo },
                    })
                );
            }
        }

        await prisma.$transaction(transactionOps);

        return res.status(200).send({ message: "Update Successful", type: "success" });
    } catch (error) {
        console.error("updateStyleReq error:", error);
        return res.status(500).send({ message: "Update Failed", type: "error" });
    }
};