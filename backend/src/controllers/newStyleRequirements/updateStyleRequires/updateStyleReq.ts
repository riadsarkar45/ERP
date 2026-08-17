import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../../database/prismaClient/prisma";
import { evaluateQtyExpression } from "./evaluateQtyExpression";

interface UpdateStyleReqBody {
    salesContact?: string;
    buyerName?: string;
    styleNo?: string;
    poNo?: string;
    jobNo?: string;
    changedTable?: string;
    composition?: string;
    finishDia?: string;
    orderQty?: string;
    rowId?: number;
    color?: string;
    additional?: string;
    finishRequiredQty?: number;
}

export const updateStyleReq = async (req: Request, res: Response) => {
    const { salesContact, buyerName, styleNo, additional, rowId, poNo, jobNo, changedTable, finishRequiredQty, composition, finishDia, orderQty, color } = req.body as UpdateStyleReqBody;

    const { jobId } = req.params as { jobId: string };
    console.log(req.body);
    try {
        if (changedTable === "styleRequirementRows") {
            if (!rowId) {
                return res.status(400).send({ message: "rowId is required", type: "error" });
            }

            const existingRow = await prisma.styleRequirementRow.findUnique({
                where: { id: rowId },
                select: { id: true, styleRequirementId: true, composition: true, color: true },
            });

            if (!existingRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            const evaluatedOrderQty = orderQty !== undefined ? evaluateQtyExpression(orderQty) : null;
            const evaluatedFinishRequiredQty = finishRequiredQty !== undefined ? evaluateQtyExpression(String(finishRequiredQty)) : null;

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

        if (changedTable === "compositionAdd") {
            if (!rowId) {
                return res.status(400).send({ message: "rowId is required", type: "error" });
            }

            const targetRow = await prisma.styleRequirementRow.findUnique({
                where: { id: rowId },
                select: { styleRequirementId: true, composition: true, color: true },
            });

            if (!targetRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            const additionalNum = evaluateQtyExpression(String(additional)) ?? 0;
            if (additional === undefined || isNaN(additionalNum)) {
                return res.status(400).send({ message: "A valid additional value is required", type: "error" });
            }

            await prisma.$transaction([
                prisma.styleRequirementRow.update({
                    where: { id: rowId },
                    data: { additional: additionalNum },
                }),
                prisma.composition.updateMany({
                    where: { styleRequirementRowId: rowId },
                    data: { additional: additionalNum },
                }),
                prisma.composition.updateMany({
                    where: {
                        styleRequirementRowId: null,
                        workOrder: { styleRequirementId: targetRow.styleRequirementId },
                        composition: targetRow.composition,
                        color: targetRow.color,
                    },
                    data: { additional: additionalNum },
                }),
            ]);

            return res.status(200).send({ message: "Update Successful", type: "success" });
        }

        // updating styleRequirement parent fields
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

        const transactionOps: Prisma.PrismaPromise<any>[] = [
            prisma.styleRequirement.update({
                where: { id: jobIdToNumber },
                data: {
                    ...(salesContact !== undefined && { salesContact }),
                    ...(buyerName !== undefined && { buyerName }),
                    ...(styleNo !== undefined && { styleNo }),
                    ...(jobNo !== undefined && { jobNo }),
                    ...(poNo !== undefined && { poNo }),
                },
            }),
        ];

        if (jobNo && jobNo !== existingStyleReq.jobNo) {
            const existingJob = await prisma.jobs.findUnique({
                where: { jobNo: existingStyleReq.jobNo },
                select: { id: true },
            });
            if (existingJob) {
                transactionOps.push(
                    prisma.jobs.update({
                        where: { id: existingJob.id },
                        data: { jobNo },
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