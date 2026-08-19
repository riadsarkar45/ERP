import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getDeliveryTotals = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };

    const compositions = await prisma.composition.findMany({
        where: { orderType },
        select: {
            orderType: true,
            workOrderQty: true,
            deliveries: {
                select: {
                    deliveryQty: true,
                    deliveryType: true,
                }
            }
        }
    });

    // work in hundredths (2 decimal precision) to avoid float drift
    const toInt = (n: number) => Math.round(n * 100);
    const fromInt = (n: number) => n / 100;

    const sumByKey = <T extends Record<string, any>>(
        rows: T[],
        keyField: keyof T,
        qtyField: keyof T
    ): Record<string, number> => {
        const acc: Record<string, number> = {};
        for (const row of rows) {
            const key = String(row[keyField]).replace(/\s+/g, "");
            acc[key] = (acc[key] || 0) + toInt(Number(row[qtyField]));
        }
        return acc;
    };

    // orderType sums (from the top-level composition rows)
    const workOrderSums = sumByKey(compositions, "orderType", "workOrderQty");

    // flatten nested deliveries from every composition row into one array
    const allDeliveries = compositions.flatMap(c => c.deliveries);
    const deliverySums = sumByKey(allDeliveries, "deliveryType", "deliveryQty");

    // merge: union of keys from both maps
    const allTypes = new Set([...Object.keys(workOrderSums), ...Object.keys(deliverySums)]);

    const merged: Record<string, { workOrderQty: number; deliveryQty: number }> = {};
    for (const type of allTypes) {
        merged[type] = {
            workOrderQty: fromInt(workOrderSums[type] || 0),
            deliveryQty: fromInt(deliverySums[type] || 0),
        };
    }

    if (Object.keys(merged).length === 0) {
        return res.status(404).send({ message: "No summary found", type: "error" });
    }

    res.send(merged);
};