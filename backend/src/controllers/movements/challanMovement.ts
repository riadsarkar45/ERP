import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const challanMovement = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };

    if (!orderType) {
        return res.status(400).send({ msg: "No order type found", type: "error" });
    }

    console.log(orderType);
    // const where = { orderType };

    const deliveries = await prisma.deliveries.findMany({
        where: {
            composition: {
                orderType: orderType,
            },
        },
        select: {
            challanNo: true,
            deliveryType: true,
            fromFactory: true,
            toFactory: true,
            deliveryQty: true,
        },
    });

    if (!deliveries || deliveries.length === 0) {
        return res.status(404).send({ msg: "No deliveries found for the given order type", type: "error" });
    }

    // group by challanNo, sum deliveryQty
    const grouped = Object.values(
        deliveries.reduce((acc, d) => {
            const key = d.challanNo;
            if (!acc[key]) {
                acc[key] = {
                    challanNo: d.challanNo,
                    deliveryType: d.deliveryType,
                    fromFactory: d.fromFactory,
                    toFactory: d.toFactory,
                    deliveryQty: 0,
                };
            }
            acc[key].deliveryQty += d.deliveryQty;
            return acc;
        }, {} as Record<number, { challanNo: number; deliveryType: string; fromFactory: string; toFactory: string; deliveryQty: number }>)
    );

    return res.status(200).send({ msg: "Deliveries found", type: "success", data: grouped });
};