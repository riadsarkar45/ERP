import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const createNewAudit = async (req: Request, res: Response) => {
    const { auditTitle, auditStartDate, auditEndDate, auditDesc } = req.body as {
        auditTitle: string, auditStartDate: Date, auditEndDate: Date, auditDesc: string
    };

    if (!auditTitle || !auditStartDate || !auditEndDate || !auditDesc) {
        return res.status(400).send({ message: "All fields are required", type: "error" })
    }

    const createAudit = await prisma.audit.create(
        {
            data: {
                auditTitle: auditTitle,
                auditStartDate: new Date(auditStartDate),
                auditEndDate: new Date(auditEndDate),
                auditDesc: auditDesc
            }
        }
    )

    if (!createAudit) {
        res.status(400).send({ message: "Failed to create new audit", type: "error" })
    }
    res.status(201).send({ message: "New audit created", type: "success" })


}