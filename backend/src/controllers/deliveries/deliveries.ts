import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { successResponse, errorResponse, validationError } from "../../utils/responseHandler";

export const deliveryDetail = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        if (!id) {
            return res.status(400).json(validationError("ID is required"));
        }

        const deliveries = await prisma.composition.findUnique({
            where: { id: Number(id) },
            select: {
                composition: true,
                workOrderQty: true,
                orderQty: true,
                deliveries: {
                    where: { yarnId: Number(id) },
                    select: {
                        deliveryType: true,
                        deliveryQty: true,
                        deliveryDate: true,
                        challanNo: true,
                        fromFactory: true,
                        toFactory: true
                    }
                },
                workOrder: {
                    select: {
                        styleRequirement: {
                            select: {
                                processLoss: true,
                                buyerName: true,
                                rows: {
                                    select: {
                                        composition: true,
                                        orderQty: true,
                                        finishRequiredQty: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!deliveries) {
            return res.status(404).json(errorResponse("Delivery not found"));
        }

        res.status(200).json(successResponse(deliveries, "Delivery details fetched successfully"));
    } catch (error) {
        console.error("DeliveryDetail error:", error);
        res.status(500).json(errorResponse("Failed to fetch delivery details"));
    }
};