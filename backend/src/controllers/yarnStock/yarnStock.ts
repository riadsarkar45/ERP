import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const yarnStock = async (req: Request, res: Response) => {
    try {
        const {
            workOrderQty,
            lotNo,
            yarnCount
        } = req.query;

        console.log(req.query);

        const workOrderToNumber = Number(workOrderQty);

        const where: any = {
            physicalBalanceQty: {
                gt: workOrderToNumber
            }
        };

        if (lotNo) {
            where.lotNo = String(lotNo);
        }

        if (yarnCount) {
            where.count = String(yarnCount);
        }

        const yarnStock = await prisma.yarnStock.findMany({
            where,

            orderBy: {
                physicalBalanceQty: "desc"
            },

            select: {
                supplierName: true,
                composition: true,
                lotNo: true,
                id: true,
                physicalBalanceQty: true,
                count: true,
            }
        });

        if (yarnStock.length === 0) {
            return res.status(404).send({
                message: "No data found",
                type: "error"
            });
        }

        return res.send(yarnStock);

    } catch (error) {
        console.error(error);

        return res.status(500).send({
            message: "Something went wrong",
            type: "error"
        });
    }
};



// Keep your existing imports at the top (Request, Response, prisma)

const DELIVERY_TYPES = [
    "Yarn Delivery For Yarn Dye",
    "Yarn Return From Yarn Dye",
    "Yarn Received From Yarn Dye",
    "Finish Received",
    "Finish Return",
    "Yarn Delivery",
    "Yarn Return",
] as const;

const STOCK_TYPES = {
    YARN_FOR_DYE: "Yarn Delivery For Yarn Dye",
    FINISH_RECEIVED: "Finish Received",
    FINISH_RETURN: "Finish Return",
    YARN_DELIVERY: "Yarn Delivery",
    YARN_RETURN: "Yarn Return",
} as const;

type DeliveryRecord = {
    deliveryType: string;
    deliveryQty: number;
    deliveryDate: Date;
    challanNo: number;
    fromFactory: string;
    toFactory: string;
};

type CompositionRecord = {
    id: number;
    composition: string;
    color: string;
    workOrderQty: number;
    machineDia: string | null;
    lotNo: string | null;
    yarnCount: string | null;
    orderType: string;
    yarnColors: { color: string }[];
    workOrder: { jobNo: string };
    deliveries: DeliveryRecord[];
};

const normalize = (value: unknown): string =>
    String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

// Stock group = the job number.
const getJobKey = (item: CompositionRecord): string =>
    normalize(item.workOrder.jobNo);

const sumDeliveryQty = (
    deliveries: DeliveryRecord[],
    deliveryType: string
): number => {
    return deliveries.reduce((total, delivery) => {
        if (delivery.deliveryType !== deliveryType) {
            return total;
        }

        return total + (Number(delivery.deliveryQty) || 0);
    }, 0);
};

const groupByJob = (
    items: CompositionRecord[]
): Map<string, CompositionRecord[]> => {
    const map = new Map<string, CompositionRecord[]>();

    for (const item of items) {
        const key = getJobKey(item);
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
    }

    return map;
};

export const ydStock = async (req: Request, res: Response) => {
    try {
        const compositions = await prisma.composition.findMany({
            where: {
                orderType: {
                    in: ["yarnDyeingOrder", "knittingOrder"],
                },
            },

            select: {
                id: true,
                composition: true,
                color: true,
                workOrderQty: true,
                machineDia: true,
                lotNo: true,
                yarnCount: true,
                orderType: true,

                yarnColors: {
                    select: {
                        color: true,
                    },
                },

                workOrder: {
                    select: {
                        jobNo: true,
                    },
                },

                deliveries: {
                    where: {
                        deliveryType: {
                            in: [...DELIVERY_TYPES],
                        },
                    },

                    select: {
                        deliveryType: true,
                        deliveryQty: true,
                        deliveryDate: true,
                        challanNo: true,
                        fromFactory: true,
                        toFactory: true,
                    },

                    orderBy: {
                        deliveryDate: "asc",
                    },
                },
            },

            orderBy: {
                id: "desc",
            },
        });

        if (compositions.length === 0) {
            return res.status(404).json({
                message: "No yarn dyeing stock data found",
                type: "error",
                data: [],
            });
        }

        const ydCompositions = compositions.filter(
            (item) => item.orderType === "yarnDyeingOrder"
        ) as CompositionRecord[];

        const knittingCompositions = compositions.filter(
            (item) => item.orderType === "knittingOrder"
        ) as CompositionRecord[];

        const ydByJob = groupByJob(ydCompositions);
        const knittingByJob = groupByJob(knittingCompositions);

        // One row per job that has a yarn dyeing order.
        const result = Array.from(ydByJob.entries()).map(([jobKey, ydItems]) => {
            const knittingItems = knittingByJob.get(jobKey) ?? [];

            const ydDeliveries = ydItems.flatMap((item) => item.deliveries);
            const knittingDeliveries = knittingItems.flatMap(
                (item) => item.deliveries
            );

            // Yarn sent to the dye house for this job.
            const yarnForDyeQty = sumDeliveryQty(
                ydDeliveries,
                STOCK_TYPES.YARN_FOR_DYE
            );

            // Stock goes UP when dyed yarn comes back (Finish Received).
            const finishReceivedQty = sumDeliveryQty(
                ydDeliveries,
                STOCK_TYPES.FINISH_RECEIVED
            );

            // Stock goes DOWN when yarn is delivered to knitting (same job).
            const yarnDeliveryQty = sumDeliveryQty(
                knittingDeliveries,
                STOCK_TYPES.YARN_DELIVERY
            );

            // Shown for information only (not part of the stock formula).
            const finishReturnQty = sumDeliveryQty(
                ydDeliveries,
                STOCK_TYPES.FINISH_RETURN
            );

            const yarnReturnQty = sumDeliveryQty(
                knittingDeliveries,
                STOCK_TYPES.YARN_RETURN
            );

            const availableStock = finishReceivedQty - yarnDeliveryQty;

            // Knitting work order qty of the same job.
            const knittingWorkOrderQty = knittingItems.reduce(
                (total, item) => total + Number(item.workOrderQty || 0),
                0
            );

            const first = ydItems[0]!;

            // Merge booking colors without duplicates.
            const colorMap = new Map<string, string>();

            for (const item of ydItems) {
                for (const yarnColor of item.yarnColors) {
                    const colorKey = normalize(yarnColor.color);

                    if (!colorMap.has(colorKey)) {
                        colorMap.set(colorKey, yarnColor.color);
                    }
                }
            }

            const allDeliveries = [
                ...ydDeliveries.map((delivery) => ({
                    ...delivery,
                    sourceOrderType: "yarnDyeingOrder",
                })),

                ...knittingDeliveries.map((delivery) => ({
                    ...delivery,
                    sourceOrderType: "knittingOrder",
                })),
            ].sort(
                (a, b) =>
                    new Date(a.deliveryDate).getTime() -
                    new Date(b.deliveryDate).getTime()
            );

            return {
                id: first.id,

                compositionIds: ydItems.map((item) => item.id),

                composition: first.composition,
                color: first.color,

                compositions: ydItems.map((item) => ({
                    id: item.id,
                    composition: item.composition,
                    color: item.color,
                    workOrderQty: Number(item.workOrderQty || 0),
                })),

                workOrderQty: ydItems.reduce(
                    (total, item) => total + Number(item.workOrderQty || 0),
                    0
                ),

                machineDia: first.machineDia,
                lotNo: first.lotNo,
                yarnCount: first.yarnCount,

                yarnColors: Array.from(colorMap.values()).map((color) => ({
                    color,
                })),

                workOrder: first.workOrder,

                deliveries: allDeliveries,

                matchedKnittingCompositionIds: knittingItems.map(
                    (item) => item.id
                ),

                knittingWorkOrderQty,

                stockSummary: {
                    yarnForDyeQty,
                    finishReceivedQty,
                    finishReturnQty,
                    yarnReturnQty,
                    yarnDeliveryQty,
                    knittingWorkOrderQty,
                    knittingAwaitingQty: knittingWorkOrderQty - yarnDeliveryQty,
                    availableStock,
                },
            };
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("YD Stock API Error:", error);

        return res.status(500).json({
            message: "Failed to fetch yarn dyeing stock",
            type: "error",
            error:
                error instanceof Error
                    ? error.message
                    : "Internal server error",
        });
    }
};