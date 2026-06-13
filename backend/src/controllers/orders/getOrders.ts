import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";
import { calculateYarnCompStat } from "../../utils/yarnCompStat";
export const getAllOrders = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };
    console.log(orderType);
    try {
        const jobs = await prisma.jobs.findMany({
            select: {
                jobNo: true,
                createdAt: true,
                workOrders: {
                    where: { orderType: orderType },
                    select: {
                        id: true,
                        workOrderNo: true,
                        workOrderPlaceDate: true,
                        month: true,
                        styleNo: true,
                        lotNo: true,
                        orderType: true,
                        yarnDyeingJobs:{
                            select: {
                                qty: true,
                                color: true,
                                composition:true,
                            }
                        },
                        compositions: {
                            select: {
                                id: true,
                                composition: true,
                                color: true,
                                orderQty: true,
                                workOrderQty: true,
                                unitePrice: true,
                                deliveries: {
                                    select: {
                                        id: true,
                                        deliveryQty: true,
                                        deliveryType: true,
                                    }
                                }
                            }
                        },

                        // ✅ styleRequirement (singular optional relation) - FIXED
                        styleRequirement: {
                            select: {
                                processLoss: true,
                                buyerName: true,
                                styleNo: true,
                                rows: {
                                    select: {
                                        color: true,
                                        composition: true,
                                        orderQty: true,
                                        finishRequiredQty: true, // add if needed
                                    }
                                }
                            }
                        }
                    },
                },
            }
        });

        if (!jobs) {
            return res.status(404).send({ message: "No factory order details found" });
        }

        const comptStats = calculateYarnCompStat(jobs);

        res.status(200).send(comptStats);
    } catch (e) {
        console.log(e);
    }
}