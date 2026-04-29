import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const dashboardController = async (req: Request, res: Response) => {
    // const countDyeOrders = await prisma.workOrder.groupBy(
    //     {
    //         by: ["orderType"],
    //         _count: {
    //             orderType: true,
    //         }
    //     }
    // )

    const [complete, canceled, pending, upComing] = await Promise.all([
        prisma.audit.count({ where: { auditType: "complete" } }),
        prisma.audit.count({ where: { auditType: "canceled" } }),
        prisma.audit.count({ where: { auditType: "pending" } }),
        prisma.audit.count({ where: { auditType: "upComing" } }),
    ]);


    // const counts = countDyeOrders.reduce<Record<string, number>>((acc, item) => {
    //     acc[item.orderType] = item._count.orderType;
    //     return acc;
    // }, {});

    // if (Object.keys(countDyeOrders).length < 0) {
    //     res.status(404).send({ message: "No data found", type: "error" })
    // }

    // res.status(200).send({ data: counts, audits: complete, canceled, pending, upComing, type: "success" })
}