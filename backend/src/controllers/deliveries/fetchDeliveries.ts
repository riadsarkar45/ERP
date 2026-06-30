import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const deliveryDetail = async (req: Request, res: Response) => {
    const { orderType } = req.params;
    const { workOrderIds } = req.query;
    const ids = String(workOrderIds).split(',').map(Number);
    const deliveries = await prisma.composition.findMany({
        where: {
            workOrderId: { in: ids },
            workOrder: { orderType: orderType as string }
        },
        select: {
            id: true,
            composition: true,
            workOrderQty: true,
            orderQty: true,
            workOrderId: true,
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