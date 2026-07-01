import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { glanceReportHandler } from "./glanceHandler";

export const GlanceReport = async (req: Request, res: Response) => {

    try {
        const data = await prisma.jobs.findMany(
            {
                select: {
                    id: true,
                    jobNo: true,
                    workOrders: {
                        select: {
                            id: true,
                            orderType: true,
                            factoryName: true,
                            styleRequirement: {
                                select: {
                                    id: true,
                                    buyerName: true,
                                    processLoss: true,
                                }

                            },
                            compositions: {
                                select: {
                                    id: true,
                                    composition: true,
                                    unitePrice: true,
                                    workOrderQty: true,
                                    orderType: true,
                                    deliveries: {
                                        select: {
                                            id: true,
                                            deliveryType: true,
                                            deliveryQty: true,
                                            toFactory: true,
                                            fromFactory: true,
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        )

        const reportHandler = await glanceReportHandler(data)

        res.status(200).send({ message: "Glance report fetched successfully", type: "success", reportHandler })

    } catch (err) {
        console.log(err);
        res.status(500).send({ message: "Error fetching glance report", type: "error" });
    }


}