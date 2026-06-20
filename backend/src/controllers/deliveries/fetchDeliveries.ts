import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const deliveryDetail = async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log(id);
    const deliveries = await prisma.composition.findUnique({
        where: { id: Number(id) },
        select: {
            composition: true,
            workOrderQty: true,
            orderQty: true,
            deliveries: {
                where: { yarnId: Number(id) },
                select: {
                    deliveryType: true,
                    deliveryQty: true,
                    deliveryDate: true,
                    challanNo: true,
                    fromFactory: true,
                    toFactory: true
                }
            },
            workOrder: {

                select: {
                    yarnDyeingJobs: {
                        select: {
                            id: true,
                            qty: true,
                            color: true,
                            composition: true,
                        }
                    },
                    styleRequirement: {
                        select: {
                            processLoss: true,
                            buyerName: true,

                            rows: {
                                select: {
                                    composition: true,
                                    orderQty: true,
                                    finishRequiredQty: true
                                }
                            }
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