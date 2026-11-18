import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const deliveryDetail = async (req: Request, res: Response) => {
    const { orderType } = req.params;
    const { workOrderIds } = req.query;
    // const ids = String(workOrderIds).split(',').map(Number);

    const isYarnDyeingOrder = orderType === "yarnDyeingOrder"

    const deliveries = await prisma.workOrder.findMany({
        where: {
            id: Number(workOrderIds) as number,
            orderType: orderType as string
        },
        orderBy: { id: "desc" },
        select: {
            id: true,
            orderType: true,
            factoryName: true,
            compositions: {
                select: {
                    ...(!isYarnDyeingOrder && {
                        id: true,
                        composition: true,
                        color: true,
                        workOrderQty: true,
                        yarnCount: true,
                        lotNo: true,
                        stichLength: true,
                        piId: true,
                    }),
                    yarnColors: {
                        select: {
                            color: true,
                            qty: true,
                            id: true,
                        }
                    },
                    styleRequirementRow: {
                        select: {
                            styleRequirement: {
                                select: {
                                    jobNo: true,
                                    processLoss: true,
                                    buyerName: true,
                                }
                            }
                        }
                    },
                    deliveries: {
                        select: {
                            id: true,
                            deliveryType: true,
                            deliveryQty: true,
                        }
                    }
                }


            }
        }
    })
    if (!deliveries) {
        return res.status(404).json({ message: "Delivery not found" });
    }
    res.send(deliveries);
}