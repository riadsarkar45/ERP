import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";
import { evaluateQtyExpression } from "../../newStyleRequirements/updateStyleRequires/evaluateQtyExpression";

export const updateWorkOrder = async (req: Request, res: Response) => {

    const { workOrderId, orderType } = req.params;

    if (!workOrderId || !orderType) {
        return res.status(404).send({ message: "Missing Required Field", type: "error" })
    }


    try {

        const findWorkOrder = await prisma.workOrder.findUnique(
            {
                where: { id: Number(workOrderId), orderType: String(orderType) },
                select: {
                    id: true,
                    factoryName: true,
                    compositions: {
                        select: {
                            id: true,
                            workOrderQty: true,
                            lotNo: true,
                            yarnCount: true,
                            stichLength: true,
                            piId: true,
                            unitePrice: true,
                            machineDia: true,
                            ...orderType === "yarnDyeingOrder" && {
                                yarnColors: {
                                    select: {
                                        color: true,
                                        qty: true,
                                        lotNo: true,
                                        yarnCount: true,
                                        shade: true,
                                        id: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        )

        if (!findWorkOrder) {
            return res.status(404).send({ message: "No work order found", type: "error" })
        }

        return res.status(200).send({ data: findWorkOrder, type: "success" })

    } catch (e) {
        console.log(e);
        return res.status(500).send({ message: "Update failed", type: "error" });
    }
}



export const reviseWorkOrderData = async (req: Request, res: Response) => {
    const { workOrderId, orderType } = req.params;

    const userId = req.user?.userId;

    if (!userId) {
        return res.status(404).send({ message: "Not authorized", type: 'error' })
    }

    const {
        id,
        factoryName,
        revisedRemarks,
        compositions = [],
    } = req.body;

    if (!workOrderId || !orderType) {
        return res.status(400).send({
            message: "Missing required fields",
            type: "error",
        });
    }

    try {
        // All updates and creates happen inside one transaction
        const updatedWorkOrderId = await prisma.$transaction(
            async (tx) => {
                const workOrder = await tx.workOrder.findFirst({
                    where: {
                        id: Number(workOrderId),
                        orderType: String(orderType),
                    },
                    select: {
                        id: true,
                        revisionCount: true,
                    },
                });

                if (!workOrder) {
                    throw new Error("Work order not found");
                }

                if (id != null && Number(id) !== workOrder.id) {
                    throw new Error("Invalid work order ID");
                }

                // Update WorkOrder fields
                const workOrderData: Record<string, any> = {};

                if (factoryName !== undefined) {
                    workOrderData.factoryName = factoryName;
                }

                if (revisedRemarks !== undefined) {
                    workOrderData.revisIonRemarks = revisedRemarks;
                }

                if (Object.keys(workOrderData).length > 0) {
                    await tx.workOrder.update({
                        where: {
                            id: workOrder.id,
                        },
                        data: {
                            ...workOrderData,
                            revisionCount: String(
                                Number(workOrder.revisionCount || "0") + 1
                            ),
                            revisedBy: String(userId)
                            
                        },

                    });
                }

                // Process every composition
                for (const composition of compositions) {
                    const {
                        id: compositionId,
                        yarnColors = [],
                        ...compositionData
                    } = composition;

                    const data = {
                        ...compositionData,

                        ...(compositionData.workOrderQty !== undefined && {
                            workOrderQty: Number(compositionData.workOrderQty),
                        }),

                        ...(compositionData.unitePrice !== undefined && {
                            unitePrice: Number(compositionData.unitePrice),
                        }),

                        ...(compositionData.orderQty !== undefined && {
                            orderQty: Number(compositionData.orderQty),
                        }),

                        ...(compositionData.additional !== undefined && {
                            additional: Number(compositionData.additional),
                        }),
                    };

                    let savedComposition;

                    if (compositionId != null) {
                        // Update existing composition
                        savedComposition = await tx.composition.update({
                            where: {
                                id: Number(compositionId),
                                workOrderId: workOrder.id,
                            },
                            data,
                        });
                    } else {
                        // Create new composition
                        savedComposition = await tx.composition.create({
                            data: {
                                ...data,
                                composition: data.composition ?? "NULL",
                                color: data.color ?? "NULL",
                                orderQty: Number(data.orderQty ?? 0),
                                unitePrice: Number(data.unitePrice ?? 0),
                                workOrderQty: Number(data.workOrderQty ?? 0),
                                workOrderId: workOrder.id,
                                orderType,
                            },
                        });
                    }

                    // Yarn colors are only applicable to yarn dyeing orders
                    if (orderType !== "yarnDyeingOrder") {
                        continue;
                    }

                    // Process every yarn color
                    for (const yarnColor of yarnColors) {
                        const {
                            id: yarnColorId,
                            qty,
                            price,
                            ...colorData
                        } = yarnColor;

                        const yarnColorUpdate = {
                            ...colorData,

                            ...(qty !== undefined && {
                                qty: Number(qty),
                            }),

                            ...(price !== undefined && {
                                price: Number(price),
                            }),
                        };

                        if (yarnColorId != null) {
                            // Update existing yarn color
                            await tx.yarnColorBooking.update({
                                where: {
                                    id: Number(yarnColorId),
                                    compositionId: savedComposition.id,
                                },
                                data: yarnColorUpdate,
                            });
                        } else {
                            // Create new yarn color
                            await tx.yarnColorBooking.create({
                                data: {
                                    ...yarnColorUpdate,
                                    qty: Number(qty ?? 0),
                                    price: Number(price ?? 0),
                                    compositionId: savedComposition.id,
                                },
                            });
                        }
                    }
                }

                // Return only the ID.
                // Fetching the complete work order inside the transaction
                // can unnecessarily extend transaction execution time.
                return workOrder.id;
            },
            {
                maxWait: 10000,
                timeout: 30000,
            }
        );

        // Fetch the updated work order AFTER transaction commits
        const result = await prisma.workOrder.findUnique({
            where: {
                id: updatedWorkOrderId,
            },
            include: {
                compositions: {
                    include: {
                        ...(orderType === "yarnDyeingOrder" && {
                            yarnColors: true,
                        }),
                    },
                },
            },
        });

        return res.status(200).send({
            message: "Work order updated successfully",
            data: result,
            type: "success",
        });

    } catch (error: any) {
        console.error("reviseWorkOrderData:", error);

        const isNotFound =
            error.message === "Work order not found" ||
            error.message === "Invalid work order ID";

        return res.status(isNotFound ? 404 : 500).send({
            message: error.message || "Work order update failed",
            type: "error",
        });
    }
};
