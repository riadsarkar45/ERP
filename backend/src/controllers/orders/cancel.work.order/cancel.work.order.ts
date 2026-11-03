import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";


const DELIVERY_TYPES_BY_ORDER: Record<string, string[]> = {
    knittingOrder: [
        "Yarn Delivery",
        "Yarn Return",
        "Grey Fabric Received",
    ],

    dyeingOrder: [
        "Grey Delivery",
        "Grey Received",
        "Grey Return",
        "Received From Compacting",
        "Received From Reprocess",
        "Received From HEAT Set",
        "Received From Trumble",
    ],

    aopOrder: [
        "Sent For Aop",
        "Return From Aop",
        "Received From Aop",
    ],

    yarnDyeingOrder: [
        "Yarn Delivery For Yarn Dye",
        "Yarn Return From Yarn Dye",
        "Yarn Received From Yarn Dye",
        "Finish Received",
        "Finish Return",
    ],
};

export const cancelWorkOrder = async (
    req: Request,
    res: Response
) => {
    const workOrderId = Number(req.params.workOrderId);
    const userId = Number(req.user?.userId);

    const {
        reason,
        remarks = "",
        fullCancel,
        compositionIds = [],
    } = req.body;

    if (
        !Number.isInteger(workOrderId) ||
        workOrderId <= 0 ||
        !Number.isInteger(userId) ||
        userId <= 0
    ) {
        return res.status(400).json({
            message: "Invalid work order or user ID",
            type: "error",
        });
    }

    if (!reason || typeof reason !== "string") {
        return res.status(400).json({
            message: "Cancellation reason is required",
            type: "error",
        });
    }

    if (
        reason.trim() === "Other" &&
        (!remarks || !remarks.trim())
    ) {
        return res.status(400).json({
            message: "Remarks are required for Other reason",
            type: "error",
        });
    }

    if (typeof fullCancel !== "boolean") {
        return res.status(400).json({
            message: "fullCancel must be a boolean",
            type: "error",
        });
    }

    if (!Array.isArray(compositionIds)) {
        return res.status(400).json({
            message: "compositionIds must be an array",
            type: "error",
        });
    }

    // Partial cancellation is not implemented yet.
    if (!fullCancel) {
        return res.status(501).json({
            message: "Partial cancellation is not implemented yet",
            type: "error",
        });
    }

    try {
        const result = await prisma.$transaction(
            async (tx: any) => {
                const workOrder = await tx.workOrder.findUnique({
                    where: {
                        id: workOrderId,
                    },

                    select: {
                        id: true,
                        jobNo: true,
                        orderType: true,
                        isCancelled: true,

                        compositions: {
                            select: {
                                id: true,

                                deliveries: {
                                    where: {
                                        deliveryQty: {
                                            gt: 0,
                                        },
                                    },

                                    select: {
                                        id: true,
                                        deliveryType: true,
                                        deliveryQty: true,
                                        challanNo: true,
                                    },
                                },
                            },
                        },
                    },
                });

                if (!workOrder) {
                    throw Object.assign(
                        new Error("Work order not found"),
                        { statusCode: 404 }
                    );
                }

                if (workOrder.isCancelled) {
                    throw Object.assign(
                        new Error("Work order is already cancelled"),
                        { statusCode: 409 }
                    );
                }

                const allowedDeliveryTypes =
                    DELIVERY_TYPES_BY_ORDER[workOrder.orderType];

                if (!allowedDeliveryTypes) {
                    throw Object.assign(
                        new Error(
                            `Unsupported order type: ${workOrder.orderType}`
                        ),
                        { statusCode: 400 }
                    );
                }

                // Check only the delivery types applicable to this order.
                const blockingDeliveries =
                    workOrder.compositions.flatMap((composition: any) =>
                        composition.deliveries
                            .filter((delivery: any) =>
                                allowedDeliveryTypes.includes(
                                    delivery.deliveryType
                                )
                            )
                            .map((delivery: any) => ({
                                compositionId: composition.id,
                                deliveryId: delivery.id,
                                deliveryType: delivery.deliveryType,
                                deliveryQty: delivery.deliveryQty,
                                challanNo: delivery.challanNo,
                            }))
                    );

                if (blockingDeliveries.length > 0) {
                    throw Object.assign(
                        new Error(
                            "Work order cannot be cancelled because delivery records with quantity greater than zero exist."
                        ),
                        {
                            statusCode: 409,
                            blockingDeliveries,
                        }
                    );
                }

                // Atomic cancellation update.
                const updateResult = await tx.workOrder.updateMany({
                    where: {
                        id: workOrderId,
                        isCancelled: false,
                    },

                    data: {
                        isCancelled: true,
                        cancelledBy: userId,
                        canceledAt: new Date(),
                        reason: reason.trim(),
                        remarks: remarks.trim(),
                    },
                });

                if (updateResult.count === 0) {
                    throw Object.assign(
                        new Error(
                            "Work order was already cancelled or updated by another request"
                        ),
                        { statusCode: 409 }
                    );
                }

                return {
                    id: workOrder.id,
                    jobNo: workOrder.jobNo,
                    orderType: workOrder.orderType,
                };
            }
        );

        return res.status(200).json({
            message: "Work order cancelled successfully",
            type: "success",
            data: result,
        });

    } catch (error: any) {
        console.error("[CANCEL WORK ORDER]", error);

        return res.status(error.statusCode || 500).json({
            message:
                error.message || "Failed to cancel work order",

            type: "error",

            ...(error.blockingDeliveries && {
                blockingDeliveries: error.blockingDeliveries,
            }),
        });
    }
};


export const getWorkOrderForCancellation = async (req: Request, res: Response) => {
    const { jobNo, orderType } = req.params;

    if (!jobNo || !orderType) {
        return res.status(400).json({
            success: false,
            message: "Job number and order type are required",
        });
    }

    try {

        const existingWorkOrder = await prisma.workOrder.findMany(
            {
                where: { jobNo: String(jobNo), orderType: String(orderType) },
                select: {
                    id: true,
                    factoryName: true,
                    jobNo: true,
                    orderType: true,
                    compositions: {
                        select: {
                            id: true,
                            color: true,
                            composition: true,
                            workOrderQty: true,
                        }
                    }
                }
            }
        )

        if (!existingWorkOrder || existingWorkOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Work order not found",
            });
        }

        return res.status(200).json({
            success: true,
            workOrder: existingWorkOrder,
        });

    } catch (error) {
        console.error("Error fetching work order for cancellation:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching the work order",
        });
    }
}