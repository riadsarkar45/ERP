import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { successResponse, errorResponse, validationError } from "../../utils/responseHandler";

export const createNewAudit = async (req: Request, res: Response) => {
    const { auditTitle, auditStartDate, auditEndDate, auditDesc } = req.body as {
        auditTitle: string, auditStartDate: Date, auditEndDate: Date, auditDesc: string
    };

    try {
        if (!auditTitle || !auditStartDate || !auditEndDate || !auditDesc) {
            return res.status(400).json(validationError("All fields are required"));
        }

        const createAudit = await prisma.audit.create({
            data: {
                auditTitle: auditTitle,
                auditStartDate: new Date(auditStartDate),
                auditEndDate: new Date(auditEndDate),
                auditDesc: auditDesc
            }
        });

        if (!createAudit) {
            return res.status(400).json(errorResponse("Failed to create audit"));
        }

        res.status(201).json(successResponse(createAudit, "Audit created successfully"));
    } catch (error) {
        console.error("CreateNewAudit error:", error);
        res.status(500).json(errorResponse("Failed to create audit"));
    }
};