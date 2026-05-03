import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";
export const getAllOrders = async (req: Request, res: Response) => {
    const { orderType } = req.params as {orderType: string};
    console.log(orderType);
    try {
        const jobs = await prisma.workOrder.findMany(
            {
                where: {
                    orderType: orderType
                },
                select: {

                    id: true,
                    workOrderNo: true,
                    workOrderPlaceDate: true,
                    month: true,
                    styleNo: true,
                    lotNo: true,
                    orderType: true,
                    compositions: {
                        select: {
                            id: true,
                            composition: true,
                            color: true,
                            orderQty: true,
                            workOrderQty: true,
                            unitePrice: true,
                            deliveries: {
                                select: {
                                    id: true,
                                    deliveryQty: true,
                                    deliveryType: true,
                                }
                            }
                        }
                    }

                   
                },

            }
        )

        if (!jobs) {
            return res.status(404).send({ message: "No factory order details found" });
        }
        res.status(200).send(jobs);
    } catch (e) {
        console.log(e);
    }
}