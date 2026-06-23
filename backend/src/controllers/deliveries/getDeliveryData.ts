import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getDeliveryData = async (req: Request, res: Response) => {
    const { jobNumber } = req.params as any;
    if (!jobNumber) {
        return res.send({ message: "No job number provided", type: "error" })
    }
    const findJobsDetail = await prisma.workOrder.findMany(
        {
            where: { jobNo: jobNumber },
            select: {
                jobId: true,
                jobNo: true,
                styleRequirement: {
                    select: {
                        buyerName: true,
                        processLoss: true,
                        rows: {
                            select: {
                                orderQty: true,
                                finishRequiredQty: true,
                            }
                        }
                    }
                },
                compositions: {
                    select: {
                        id: true,
                        composition: true,
                        color: true,
                        workOrderQty: true,
                    }
                }
            }
        },
    )

    if (!findJobsDetail) {
        res.send({ message: "No job detail found", type: "error" })
    }

    res.send({ data: findJobsDetail })
}