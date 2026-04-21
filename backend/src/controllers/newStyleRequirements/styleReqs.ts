import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
export const styleRequirements = async (req: Request, res: Response) => {
    const { jobNo } = req.params as { jobNo: string | undefined }; const whereClause: any = {};

    if (jobNo) {
        console.log(jobNo);
        whereClause.jobNo = jobNo;
    }
    const styles = await prisma.styleRequirement.findMany(
        {
            where: jobNo ? { jobNo } : {},
            select: {
                salesContact: true,
                styleNo: true,
                buyerName: true,
                jobNo: true,
                processLoss: true,
                poNo: true,
                id: true,
                rows: {
                    select: {
                        color: true,
                        composition: true,
                        finishDia: true,
                        orderQty: true,
                        finishRequiredQty: true,
                    }
                },
                sizes: {
                    select: {
                        id: true,
                        sizeName: true,
                    }
                }

            }
        }
    )

    res.status(200).send({ data: styles, type: "success" })
}