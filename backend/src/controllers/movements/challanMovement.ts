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
        take: 30,
        select: {
            challanNo: true,
            deliveryType: true,
            fromFactory: true,
            toFactory: true,
            deliveryQty: true,
            id: true,
            deliveryDate: true,
            composition: {
                select: {
                    color: true,
                    id: true,
                    composition: true,
                    workOrderQty: true,
                    unitePrice: true,
                }
            }
        },
    });

    if (!deliveries || deliveries.length === 0) {
        return res.status(404).send({ msg: "No deliveries found for the given order type", type: "error" });
    }

    // group by challanNo, sum deliveryQty
    const grouped = Object.values(
        deliveries.reduce((acc, d) => {
            if (!d.composition) {
                return acc;
            }

            const key = d.challanNo;

            if (!acc[key]) {
                acc[key] = {
                    challanNo: d.challanNo,
                    deliveryType: d.deliveryType,
                    fromFactory: d.fromFactory,
                    toFactory: d.toFactory,
                    deliveryDate: d.deliveryDate,
                    deliveryQty: 0,
                    compositions: [],
                };
            }

            acc[key].deliveryQty += d.deliveryQty;

            acc[key].compositions.push({
                id: d.composition.id,
                color: d.composition.color,
                composition: d.composition.composition,
                workOrderQty: d.composition.workOrderQty,
            });

            return acc;
        }, {} as Record<
            number,
            {
                challanNo: number;
                deliveryType: string;
                fromFactory: string;
                toFactory: string;
                deliveryQty: number;
                deliveryDate: Date;
                compositions: {
                    id: number;
                    color: string;
                    composition: string;
                    workOrderQty: number;
                }[];
            }
        >)
    );

    return res.status(200).send({ msg: "Deliveries found", type: "success", data: grouped });
};