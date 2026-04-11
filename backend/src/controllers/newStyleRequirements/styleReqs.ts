import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
export const styleRequirements = async (req: Request, res: Response) => {
    const styles = await prisma.styleRequirement.findMany(
        {
            select: {
                salesContact: true,
                styleNo: true,
                buyerName: true,
                jobNo: true,
                processLoss: true,
                poNo: true,
                rows: {
                    select: {
                        color: true,
                        composition: true,
                        finishDia: true,
                        orderQty: true,
                        finishRequiredQty: true,
                    }
                }
            }
        }
    )

    res.status(200).send({ data: styles, type: "success" })
}