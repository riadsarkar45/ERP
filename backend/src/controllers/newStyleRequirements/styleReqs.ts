import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { calculateOrdersForStyleSummary } from "../../utils/yarnCompStat";
import { successResponse, errorResponse } from "../../utils/responseHandler";

export const styleRequirements = async (req: Request, res: Response) => {
    const { jobNo } = req.params as { jobNo: string | undefined };

    try {
        const styles = await prisma.styleRequirement.findMany({
            where: jobNo ? { jobNo } : {},
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
                        color: true,
                        composition: true,
                        finishDia: true,
                        orderQty: true,
                        finishRequiredQty: true,
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
                                workOrderQty: true,
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

        if (styles.length === 0) {
            return res.status(200).json(successResponse([], "No style requirements found"));
        }

        const summaryData = calculateOrdersForStyleSummary(styles);
        res.status(200).json(successResponse(summaryData, "Style requirements fetched successfully"));
    } catch (error) {
        console.error("StyleRequirements error:", error);
        res.status(500).json(errorResponse("Failed to fetch style requirements"));
    }
};