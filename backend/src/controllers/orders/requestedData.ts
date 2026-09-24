import { truncate } from "node:fs";
import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";

export const requestedData = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const { orderType } = req.params as { orderType: string };
        console.log("route hit");
        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const requestedData =
            await prisma.workOrderApprovalRequest.findMany({
                where: {
                    requestTo: Number(userId),

                    workOrder: {
                        orderType: orderType,
                        isRequested: true,
                    },
                },

                select: {
                    requestType: true,

                    byUser: {
                        select: {
                            name: true,
                        },
                    },

                    requestAt: true,

                    workOrder: {
                        select: {
                            id: true,
                            jobNo: true,
                            factoryName: true,
                            lotNo: true,
                            machineDia: true,
                            stichLength: true,
                            yarnCount: true,
                            isRequested: true,
                            compositions: {
                                select: {
                                    composition: true,
                                    unitePrice: true,
                                    color: true,
                                    workOrderQty: true,
                                },
                            },
                        },
                    },
                },
            });

        return res.status(200).json(requestedData);
    } catch (error) {
        console.error("Failed to get requested data:", error);

        return res.status(500).json({
            message: "Failed to get requested data",
        });
    }
};