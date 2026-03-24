import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";
export const allAudits = async (req: Request, res: Response) => {
    console.log("allAudits controller hit"); // ← add this
    try {
        const getAllAudits = await prisma.audit.findMany({
            select: {
                id: true,
                auditDesc: true,
                auditEndDate: true,
                auditStartDate: true,
                auditTitle: true,
                auditType: true,
            }
        });

        if (getAllAudits.length === 0) {
            return res.status(404).send({ message: "No audits found" });
        }

        res.status(200).send(getAllAudits);
    } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Internal server error" });
    }
};