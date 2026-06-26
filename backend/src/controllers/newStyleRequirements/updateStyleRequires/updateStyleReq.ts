import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";

export const updateStyleReq = async (req: Request, res: Response) => {
    const { salesContact, buyerName, styleNo, poNo, jobNo } = req.body as {
        salesContact: string;
        buyerName: string;
        styleNo: string;
        poNo: string;
        jobNo: string;
    };

    const { jobId } = req.params as { jobId: string };
    const jobIdToNumber = Number(jobId);

    try {
        // Find the existing styleRequirement and grab its current jobNo
        const existingStyleReq = await prisma.styleRequirement.findUnique({
            where: { id: jobIdToNumber },
            select: {
                id: true,
                jobNo: true,
            },
        });

        if (!existingStyleReq) {
            return res.status(404).send({ message: "Requested data not found", type: "error" });
        }

        // Find the linked job using the CURRENT jobNo from DB (not the incoming one)
        const existingJob = await prisma.jobs.findUnique({
            where: { jobNo: existingStyleReq.jobNo },
            select: { id: true },
        });

        // Build transaction operations
        const transactionOps: any[] = [
            prisma.styleRequirement.update({
                where: { id: jobIdToNumber },
                data: {
                    salesContact,
                    buyerName,
                    styleNo,
                    jobNo,
                    poNo,
                },
            }),
        ];

        // Only update jobs table if a linked job exists and jobNo has changed
        if (existingJob && jobNo !== existingStyleReq.jobNo) {
            transactionOps.push(
                prisma.jobs.update({
                    where: { id: existingJob.id },
                    data: { jobNo },
                })
            );
        }

        await prisma.$transaction(transactionOps);

        return res.status(200).send({ message: "Update Successful", type: "success" });

    } catch (error) {
        console.error("updateStyleReq error:", error);
        return res.status(500).send({ message: "Update Failed", type: "error" });
    }
};