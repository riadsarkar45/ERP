import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const deliveryDetail = async (req: Request, res: Response) => {
    const { orderType } = req.params;
    const { workOrderIds } = req.query;
    // const ids = String(workOrderIds).split(',').map(Number);
    const deliveries = await prisma.workOrder.findMany({
        where: {
            id: Number(workOrderIds) as number,
            orderType: orderType as string
        },
        select: {
            id: true,
            orderType: true,
            factoryName: true,
            compositions: {
                select: {
                    id: true,
                    composition: true,
                    color: true,
                    workOrderQty: true,
                    styleRequirementRow:{
                        select: {
                            id: true,
                            styleRequirement: {
                                select: {
                                    jobNo: true,
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