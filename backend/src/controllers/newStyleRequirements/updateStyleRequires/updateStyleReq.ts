import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";

export const updateStyleReq = async (req: Request, res: Response) => {
    const {
        salesContact, buyerName, styleNo, additional, rowId, compId, poNo, jobNo,
        changedTable, composition, finishDia, orderQty, color,
    } = req.body as {
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
        compId?: number;
        color?: string;
        additional?: string;
    };

    const { jobId } = req.params as { jobId: string };

    try {
        if (changedTable === "styleRequirementRows") {
            if (!rowId) {
                return res.status(400).send({ message: "rowId is required", type: "error" });
            }

            const existingRow = await prisma.styleRequirementRow.findUnique({
                where: { id: rowId },
                select: { id: true },
            });

            if (!existingRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            // 1. Update the StyleRequirementRow itself
            await prisma.styleRequirementRow.update({
                where: { id: existingRow.id },
                data: {
                    ...(composition !== undefined && { composition }),
                    ...(finishDia !== undefined && { finishDia }),
                    ...(orderQty !== undefined && { orderQty: Number(orderQty) }),
                    ...(color !== undefined && { color }),
                },
            });

            // 2. Keep the related Composition row(s) in sync — identified by
            //    real foreign key, never by string matching.
            if (color !== undefined || composition !== undefined) {
                if (compId) {
                    // Frontend gave us the exact Composition id — use it directly.
                    const relatedComp = await prisma.composition.findUnique({
                        where: { id: Number(compId) },
                        select: { id: true },
                    });

                    if (relatedComp) {
                        await prisma.composition.update({
                            where: { id: relatedComp.id },
                            data: {
                                ...(composition !== undefined && { composition }),
                                ...(color !== undefined && { color }),
                            },
                        });
                    } else {
                        console.warn(`Composition ${compId} not found, skipping composition sync.`);
                    }
                } else {
                    // No compId sent — fall back to the real FK relation
                    // (styleRequirementRowId), not string matching.
                    const result = await prisma.composition.updateMany({
                        where: { styleRequirementRowId: existingRow.id },
                        data: {
                            ...(composition !== undefined && { composition }),
                            ...(color !== undefined && { color }),
                        },
                    });

                    if (result.count === 0) {
                        console.warn(
                            `No Composition rows linked via styleRequirementRowId=${existingRow.id}, skipping sync.`
                        );
                    }
                }
            }

            return res.status(200).send({ message: "Update Successful", type: "success" });
        }

        if (changedTable === "compositionAdd") {
            if (!rowId) {
                return res.status(400).send({ message: "rowId is required", type: "error" });
            }

            const existingRow = await prisma.styleRequirementRow.findUnique({
                where: { id: Number(rowId) },
                select: { id: true },
            });

            if (!existingRow) {
                return res.status(404).send({ message: "Row not found", type: "error" });
            }

            await prisma.styleRequirementRow.update({
                where: { id: Number(rowId) },
                data: {
                    ...(additional !== undefined && { additional }),
                },
            });

            if (additional !== undefined) {
                if (compId) {
                    const relatedComp = await prisma.composition.findUnique({
                        where: { id: Number(compId) },
                        select: { id: true },
                    });

                    if (relatedComp) {
                        await prisma.composition.update({
                            where: { id: relatedComp.id },
                            data: { additional },
                        });
                    } else {
                        console.warn(`Composition ${compId} not found, skipping composition sync.`);
                    }
                } else {
                    const result = await prisma.composition.updateMany({
                        where: { styleRequirementRowId: existingRow.id },
                        data: { additional },
                    });

                    if (result.count === 0) {
                        console.warn(
                            `No Composition rows linked via styleRequirementRowId=${existingRow.id}, skipping sync.`
                        );
                    }
                }
            }

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