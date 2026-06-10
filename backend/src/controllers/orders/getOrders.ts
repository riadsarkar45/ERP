import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";
import { calculateYarnCompStat } from "../../utils/yarnCompStat";
import { successResponse, errorResponse } from "../../utils/responseHandler";

export const getAllOrders = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };

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
                                        finishRequiredQty: true,
                                    }
                                }
                            }
                        }
                    },
                },
            }
        });

        if (!jobs || jobs.length === 0) {
            return res.status(404).json(errorResponse("No factory order details found"));
        }

        const comptStats = calculateYarnCompStat(jobs);
        res.status(200).json(successResponse(comptStats, "Orders fetched successfully"));
    } catch (error) {
        console.error("GetAllOrders error:", error);
        res.status(500).json(errorResponse("Failed to fetch orders"));
    }
};