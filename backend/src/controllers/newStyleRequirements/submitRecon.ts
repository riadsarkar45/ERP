import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const submitReconciliation = async (req: Request, res: Response) => {
    try {
        const { notes } = req.body;
        const { jobNo } = req.params as { jobNo: string };
        const userId = req.user?.userId;
        if (typeof notes !== "string" || !notes.trim() || typeof jobNo !== "string" || !jobNo.trim()) {
            return res.status(400).send({
                message: "Missing required fields",
                type: "error",
            });
        }

        const findStyleRequirementJob =
            await prisma.styleRequirement.findUnique({
                where: {
                    jobNo: jobNo.trim(),
                },
                select: {
                    id: true,
                },
            });

        if (!findStyleRequirementJob?.id) {
            return res.status(404).send({
                message: "Style requirement not found for this job.",
                type: "error",
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.reconciliationNotes.create({
                data: {
                    reconciliationNote: notes.trim(),
                    styleRequirementId: findStyleRequirementJob.id,
                    userId: Number(userId)
                },
            });

            await tx.styleRequirement.update({
                where: {
                    id: findStyleRequirementJob.id,
                },
                data: {
                    isReconciliationDone: true,
                },
            });
        });

        return res.status(201).send({
            message: "Reconciliation Submission Successful",
            type: "success",
        });
    } catch (error) {
        console.error("submitReconciliation error:", error);

        return res.status(500).send({
            message: "Failed to submit reconciliation",
            type: "error",
        });
    }
};