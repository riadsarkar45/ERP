import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { successResponse, errorResponse, validationError } from "../../utils/responseHandler";

export const updateAuditStatus = async (req: Request, res: Response) => {
    const { status, auditId } = req.params as { status: string, auditId: string };

    try {
        if (!status || !auditId) {
            return res.status(400).json(validationError("Status and audit ID are required"));
        }

        const checkAuditIfExist = await prisma.audit.findUnique({
            where: { id: Number(auditId) }
        });

        if (!checkAuditIfExist) {
            return res.status(404).json(errorResponse("Audit not found"));
        }

        const update = await prisma.audit.update({
            where: { id: Number(auditId) },
            data: {
                auditType: status,
            }
        });

        if (!update) {
            return res.status(500).json(errorResponse("Failed to update audit"));
        }

        res.status(200).json(successResponse(update, "Audit updated successfully"));
    } catch (error) {
        console.error("UpdateAuditStatus error:", error);
        res.status(500).json(errorResponse("Failed to update audit"));
    }
};