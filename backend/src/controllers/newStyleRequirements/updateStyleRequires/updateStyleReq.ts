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

            // get styleRequirementId from the row itself
            const existingRow = await prisma.styleRequirementRow.findUnique({
                where: { id: rowId },
                select: { id: true, styleRequirementId: true },
            });

            if (!existingRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            const updateStyleReqRow = await prisma.styleRequirementRow.update({
                where: { id: existingRow.id },
                data: {
                    ...(composition !== undefined && { composition }),
                    ...(finishDia !== undefined && { finishDia }),
                    ...(orderQty !== undefined && { orderQty: Number(orderQty) }),
                    ...(color !== undefined && { color: color })
                },
            });

            await prisma.composition.update(
                {
                    where: { id: Number(jobId) },
                    data: {
                        ...(composition !== undefined && ({ composition: composition }))
                    }
                }
            )

            if (updateStyleReqRow) {
                await prisma.composition.update(
                    {
                        where: { id: existingRow.id },
                        data: {
                            ...(color !== undefined && { color: color })
                        }
                    }
                )
            }

            return res.status(200).send({ message: "Update Successful", type: "success" });
        }

        if (changedTable === "compositionAdd") {
            await prisma.styleRequirementRow.update(
                {
                    where: { id: Number(rowId) },
                    data: {
                        additional: additional
                    }
                }
            )
            await prisma.composition.update(
                {
                    where: { id: Number(rowId) },
                    data: {
                        additional: additional
                    }
                }
            )

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