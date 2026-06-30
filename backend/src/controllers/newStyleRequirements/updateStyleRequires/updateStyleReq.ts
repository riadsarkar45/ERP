import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";

export const updateStyleReq = async (req: Request, res: Response) => {
    const { salesContact, buyerName, styleNo, additional, rowId, poNo, jobNo, changedTable, composition, finishDia, orderQty, color, } = req.body as {
        salesContact?: string;
        buyerName?: string;
        styleNo?: string;
        poNo?: string;
        jobNo?: string;
        changedTable?: string;
        composition?: string;
        finishDia?: string;
        orderQty?: number;
        rowId?: number;
        color: string;
        additional: string
    };

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

            const ops: any[] = [
                prisma.styleRequirementRow.update({
                    where: { id: existingRow.id },
                    data: {
                        ...(composition !== undefined && { composition }),
                        ...(finishDia !== undefined && { finishDia }),
                        ...(orderQty !== undefined && { orderQty: Number(orderQty) }),
                        ...(color !== undefined && { color: color }),
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
            const targetRow = await prisma.styleRequirementRow.findUnique({
                where: { id: Number(rowId) },
                select: { styleRequirementId: true, composition: true, color: true },
            });

            if (!targetRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            await prisma.$transaction([
                prisma.styleRequirementRow.update({
                    where: { id: Number(rowId) },
                    data: { additional: additional },
                }),
                prisma.composition.updateMany({
                    where: { styleRequirementRowId: Number(rowId) },
                    data: { additional: additional },
                }),
                prisma.composition.updateMany({
                    where: {
                        styleRequirementRowId: null,
                        workOrder: { styleRequirementId: targetRow.styleRequirementId },
                        composition: targetRow.composition,
                        color: targetRow.color,
                    },
                    data: { additional: additional },
                }),
            ]);

            return res.status(200).send({ message: "Update Successful", type: "success" });
        }

        // updating styleRequirement parent fields
        const jobIdToNumber = Number(jobId);

        const existingStyleReq = await prisma.styleRequirement.findUnique({
            where: { id: jobIdToNumber },
            select: { id: true, jobNo: true },
        });

        if (!existingStyleReq) {
            return res.status(404).send({ message: "Style Requirement not found", type: "error" });
        }

        const transactionOps: any[] = [
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