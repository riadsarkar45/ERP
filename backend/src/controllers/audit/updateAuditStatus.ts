import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const updateAuditStatus = async (req: Request, res: Response) => {
    const { status, auditId } = req.params as { status: string, auditId: string };

    if (!status || !auditId) {
        return res.send({ message: "Something went wrong. Please try again later.", type: "error" })
    }

    const checkAuditIfExist = await prisma.audit.findUnique(
        {
            where: { id: Number(auditId) }
        }
    )

    if (!checkAuditIfExist) {
        return res.send({ message: "No data found to update", type: "error" })
    }

    const update = await prisma.audit.update(
        {
            where: { id: Number(auditId) },
            data: {
                auditType: status,
            }
        }
    )

    if (!update) {
        return res.send({ message: "Failed to update please try again later.", type: "error" })
    }

    res.status(201).send({ message: "Update Successful", type: "success" })
}