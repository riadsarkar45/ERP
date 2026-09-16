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
            default:
                return res.status(400).send({ message: `Unknown columnName: ${columnName}`, type: "error" });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: "Something went wrong.", type: "error" });
    }
};

export const misDetailViewByJobNo = async (req: Request, res: Response) => {
    const { jobNo, deliveryType, orderType } = req.params as { jobNo: string; deliveryType: string; orderType: string };

    if (!jobNo || !deliveryType || !orderType) {
        return res.status(400).send({ message: "Required fields are missing please try again later.", type: "error" });
    }

    const deliveryTypes = deliveryType.split(",").map((t) => t.trim()).filter(Boolean);

    try {
        const findJobNo = await prisma.workOrder.findMany({
            where: { jobNo: jobNo, orderType: orderType },
            select: {
                workOrderNo: true,
                factoryName: true,
                orderType: true,
                compositions: {
                    where: { orderType: orderType },
                    select: {
                        workOrderQty: true,
                        deliveries: {
                            where: { deliveryType: { in: deliveryTypes } },
                            select: { deliveryType: true, deliveryQty: true, toFactory: true, fromFactory: true }
                        }
                    }
                }
            },
        });

        if (findJobNo.length === 0) {
            return res.status(404).send({ message: "No data found", type: "error" });
        }

        const deliveryTotals: Record<string, number> = {};
        const toFactoryTotals: Record<string, Record<string, number>> = {};
        const fromFactoryTotals: Record<string, Record<string, number>> = {};
        const workOrderQtyByFactory: Record<string, number> = {};

        const clean = (val?: string | null) => {
            const stripped = val?.replace(/\s+/g, "") || "";
            return stripped || "Unknown";
        };

        findJobNo.forEach((workOrder) => {
            const factory = clean(workOrder.factoryName);

            workOrder.compositions.forEach((comp) => {
                const qty = comp.workOrderQty ?? 0;
                workOrderQtyByFactory[factory] = (workOrderQtyByFactory[factory] || 0) + qty;

                comp.deliveries.forEach((delivery) => {
                    const type = clean(delivery.deliveryType);
                    const dQty = delivery.deliveryQty ?? 0;

                    deliveryTotals[type] = (deliveryTotals[type] || 0) + dQty;

                    if (!toFactoryTotals[type]) toFactoryTotals[type] = {};
                    toFactoryTotals[type][delivery.toFactory] = (toFactoryTotals[type][delivery.toFactory] || 0) + dQty;

                    if (!fromFactoryTotals[type]) fromFactoryTotals[type] = {};
                    fromFactoryTotals[type][delivery.fromFactory] = (fromFactoryTotals[type][delivery.fromFactory] || 0) + dQty;
                });
            });
        });

        return res.status(200).send({
            data: { jobNo, workOrderQtyByFactory, deliveryTotals, toFactoryTotals, fromFactoryTotals }
        });

    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: "Something went wrong.", type: "error" });
    }
}