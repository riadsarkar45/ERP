import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { calculateOrdersForStyleSummary } from "../../utils/yarnCompStat";

export const GlanceReport = async (req: Request, res: Response) => {

    try {
        const styles = await prisma.styleRequirement.findMany({
            orderBy: { id: "desc" },
            select: {
                salesContact: true,
                styleNo: true,
                buyerName: true,
                jobNo: true,
                processLoss: true,
                poNo: true,
                id: true,
                rows: {
                    select: {
                        id: true,
                        color: true,
                        composition: true,
                        finishDia: true,
                        orderQty: true,
                        finishRequiredQty: true,
                        additional: true,
                    }
                },
                sizes: {
                    select: {
                        id: true,
                        sizeName: true,
                    }
                },
                workOrders: {
                    select: {
                        orderType: true,
                        compositions: {
                            select: {
                                color: true,
                                composition: true,
                                workOrderQty: true,
                                additional: true,
                                deliveries: {
                                    select: {
                                        deliveryType: true,
                                        deliveryQty: true,
                                    }
                                },
                            }
                        },
                    }
                }
            }
        });

        // const reportHandler = await glanceReportHandler(data)

        const summaryData = calculateOrdersForStyleSummary(styles);

        res.status(200).send({
            data: summaryData,
            type: "success"
        });

    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Error fetching glance report", type: "error" });
    }


}