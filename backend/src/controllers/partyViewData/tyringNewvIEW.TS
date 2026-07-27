import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
// import { getDeliveryBreakdownByType, getUniqueFactoryNames } from "../../utils/yarnCompStat";

export const partyViewData = async (req: Request, res: Response) => {
    const { factoryName } = req.params as { factoryName: string | undefined };
    const whereClause = factoryName ? factoryName : {}
    const compositions = await prisma.composition.findMany({
        // where: whereClause,
        orderBy: {id: "desc", limit: 20},
        select: {
            composition: true,
            unitePrice: true,
            workOrderQty: true,
            workOrderId: true,
            id: true,
            deliveries: {
                select: {
                    id: true,
                    deliveryType: true,
                    deliveryQty: true,
                    toFactory: true,
                    fromFactory: true,
                },
            },
            workOrder: {
                select: {
                    id: true,
                    workOrderNo: true,
                    factoryName: true,
                    jobNo: true,
                },
            },
        },
    });

    if (!compositions) {
        return res.status(404).send({ message: "No data found", type: "error" })
    }

    res.send({ data: compositions })
};

