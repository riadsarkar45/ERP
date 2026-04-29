import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";
export const getAllOrders = async (req: Request, res: Response) => {
    const { orderType } = req.params as {orderType: string};
    console.log(orderType);
    try {
        const factoryOrderDetail = await prisma.factory.findMany(
            {
                select: {

                    id: true,
                    factoryName: true,
                    createdAt: true,

                    // where: { orderType: orderType },
                    //     orderBy: { id: "desc" },
                    //     select: {

                    //         workOrderNo: true,
                    //         composition: true,
                    //         yarnCount: true,
                    //         brandLot: true,
                    //         ydProcessLoss: true,
                    //         billNo: true,
                    //         remarks: true,
                    //         createdAt: true,
                    //         id: true,
                    //         orderType: true,
                    //     }
                },

            }
        )

        if (!factoryOrderDetail) {
            return res.status(404).send({ message: "No factory order details found" });
        }
        res.status(200).send(factoryOrderDetail);
    } catch (e) {
        console.log(e);
    }
}