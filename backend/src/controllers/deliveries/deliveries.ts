import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const deliveryDetail = async (req: Request, res: Response) => {
    const { id } = req.params;
    const deliveries = await prisma.composition.findUnique({
        where: { id: Number(id) },
        select: {
            deliveries: {
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