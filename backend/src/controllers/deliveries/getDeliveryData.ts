import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getDeliveryData = async (req: Request, res: Response) => {
    const { jobNumber, orderType } = req.params as any;
    if (!jobNumber) {
        return res.send({ message: "No job number provided", type: "error" })
    }
    console.log(orderType);
    const findJobsDetail = await prisma.workOrder.findMany(
        {
            where: { jobNo: jobNumber, orderType: orderType },
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
                    where: { orderType: orderType },
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