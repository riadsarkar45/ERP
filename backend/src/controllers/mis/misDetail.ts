import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { structureKnittingWorkOrder } from "./knittingMisDetailStructer";

export const misDetailView = async (req: Request, res: Response) => {
    const { columnName, jobNo } = req.params as { columnName: string, jobNo: string };

    if (!columnName || !jobNo) {
        return res.status(404).send({ message: "Required fields are missing please try again later.", type: "error" });
    }

    const formattedJobNo = jobNo.replace(/-([^-]*)$/, "/$1");


    try {
        switch (columnName) {
            case "knittingWorkOrder": {
                const knittingOrderData = await prisma.workOrder.findMany({
                    where: { orderType: "knittingOrder", jobNo: formattedJobNo },
                    select: {
                        workOrderNo: true,
                        factoryName: true,
                        compositions: { select: { workOrderQty: true } }
                    }
                });

                const knittingWorkOrderDetail = structureKnittingWorkOrder(knittingOrderData);

                if (knittingWorkOrderDetail.length === 0) {
                    return res.status(404).send({ message: "No data found", type: "error" });
                }

                return res.status(200).send({ data: knittingWorkOrderDetail });
            }

            // case "knittingYarnDelivery": {
            //     const data = await prisma.deliveries.findMany({
            //         where: { deliveryType: "knittingYarnDelivery" },
            //         select: {
            //             deliveryQty: true,
            //             deliveryDate: true,
            //             composition: {
            //                 select: {
            //                     workOrder: {
            //                         // where: {jobNo: jobNo},
            //                         select: { jobNo: true }
            //                     }
            //                 }
            //             }
            //         }
            //     });

            //     if (data.length === 0) {
            //         return res.status(404).send({ message: "No data found", type: "error" });
            //     }

            //     return res.status(200).send({ data });
            // }

            // case "knittingGreyReceived": {
            //     const data = await prisma.deliveries.findMany({
            //         where: { deliveryType: "knittingGreyReceived" },
            //         select: {
            //             deliveryQty: true,
            //             deliveryDate: true,
            //             composition: {
            //                 select: {
            //                     workOrder: {
            //                         // where: { jobNo: jobNo },
            //                         select: { jobNo: true }
            //                     }
            //                 }
            //             }
            //         }
            //     });

            //     if (data.length === 0) {
            //         return res.status(404).send({ message: "No data found", type: "error" });
            //     }

            //     return res.status(200).send({ data });
            // }

            // case "knittingYarnReturn": {
            //     const data = await prisma.deliveries.findMany({
            //         where: { deliveryType: "knittingYarnReturn" },
            //         select: {
            //             deliveryQty: true,
            //             deliveryDate: true,
            //             composition: {
            //                 select: {
            //                     workOrder: {
            //                         // where: { jobNo: jobNo },
            //                         select: { jobNo: true }
            //                     }
            //                 }
            //             }
            //         }
            //     });

            //     if (data.length === 0) {
            //         return res.status(404).send({ message: "No data found", type: "error" });
            //     }

            //     return res.status(200).send({ data });
            // }

            default:
                return res.status(400).send({ message: `Unknown columnName: ${columnName}`, type: "error" });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: "Something went wrong.", type: "error" });
    }
};