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

export const ydStock = async (req: Request, res: Response) => {
    // ---- everything below is local to this function (no name clashes) ----
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
        YARN_RECEIVED_GREY: "Yarn Received From Yarn Dye",
        FINISH_RECEIVED: "Finish Received",
        FINISH_RETURN: "Finish Return",
        YARN_DELIVERY: "Yarn Delivery",
        YARN_RETURN: "Yarn Return",
    } as const;

    // ---- Settings ----
    // A knitting Yarn Delivery is deducted from the stock only if it was
    // delivered AFTER the job's first yarn dyeing order was created.
    // false = compare when the delivery was recorded (createdAt)
    // true  = compare the delivery date entered by the user
    const USE_DELIVERY_DATE = false;
    // true = Yarn Return from knitting adds back to the stock
    // (only returns after the yarn dyeing order was created)
    const ADD_YARN_RETURN_TO_STOCK = false;
    // false = ONLY Finish Received increases the stock
    const COUNT_YARN_RECEIVED_FROM_YD = false;
    // ------------------

    type DeliveryRecord = {
        deliveryType: string;
        deliveryQty: number;
        deliveryDate: Date;
        createdAt: Date;
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
        workOrder: { jobNo: string; createdAt: Date };
        deliveries: DeliveryRecord[];
    };

    type StockRecord = {
        id: number;
        count: string;
        composition: string;
        buyer: string;
        jobNo: string;
        styleNo: string;
        color: string;
        dyedYarnLot: string;
        yarnDyedStock: unknown;
    };

    type JobGroup = {
        jobNo: string;
        ydItems: CompositionRecord[];
        knittingItems: CompositionRecord[];
        stockRows: StockRecord[];
    };

    const normalize = (value: unknown): string =>
        String(value ?? "").replace(/\s+/g, " ").trim().toLowerCase();

    const toQty = (value: unknown): number => {
        const quantity = Number(value ?? 0);

        return Number.isFinite(quantity) ? quantity : 0;
    };

    const round2 = (value: number): number =>
        Math.round((value + Number.EPSILON) * 100) / 100;

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

    const startOfUtcDay = (time: number): number => {
        const date = new Date(time);

        return Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate()
        );
    };
    // ----------------------------------------------------------------------

    try {
        // --------------------------------------------------
        // 1. Yarn dyeing + knitting orders with their deliveries
        // --------------------------------------------------
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
                        createdAt: true,
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
                        createdAt: true,
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

        // --------------------------------------------------
        // 2. Original stock saved in the ydStock table
        // --------------------------------------------------
        const stockRows = (await prisma.ydStock.findMany({
            select: {
                id: true,
                count: true,
                composition: true,
                buyer: true,
                jobNo: true,
                styleNo: true,
                color: true,
                dyedYarnLot: true,
                yarnDyedStock: true,
            },
            orderBy: {
                id: "asc",
            },
        })) as StockRecord[];

        const ydCompositions = compositions.filter(
            (item) => item.orderType === "yarnDyeingOrder"
        ) as CompositionRecord[];

        const knittingCompositions = compositions.filter(
            (item) => item.orderType === "knittingOrder"
        ) as CompositionRecord[];

        // --------------------------------------------------
        // 3. One group per job number
        // --------------------------------------------------
        const groups = new Map<string, JobGroup>();

        const getGroup = (jobNo: unknown): JobGroup | null => {
            const key = normalize(jobNo);

            if (!key) return null;

            let group = groups.get(key);

            if (!group) {
                group = {
                    jobNo: String(jobNo).trim(),
                    ydItems: [],
                    knittingItems: [],
                    stockRows: [],
                };

                groups.set(key, group);
            }

            return group;
        };

        for (const item of ydCompositions) {
            getGroup(item.workOrder?.jobNo)?.ydItems.push(item);
        }

        for (const row of stockRows) {
            getGroup(row.jobNo)?.stockRows.push(row);
        }

        // Knitting orders only count for jobs that have yarn dyeing stock.
        for (const item of knittingCompositions) {
            const group = groups.get(normalize(item.workOrder?.jobNo));

            if (group) group.knittingItems.push(item);
        }

        // --------------------------------------------------
        // 4. Stock per job
        //    original stock
        //    + Finish Received (the ONLY thing that increases stock)
        //    - Yarn Delivery to knitting delivered AFTER the
        //      yarn dyeing order was created
        // --------------------------------------------------
        const result = Array.from(groups.values()).map((group) => {
            const { ydItems, knittingItems, stockRows: jobStockRows } = group;

            const ydDeliveries = ydItems.flatMap((item) => item.deliveries);
            const knittingDeliveries = knittingItems.flatMap(
                (item) => item.deliveries
            );

            // Time the job's first yarn dyeing order was created.
            // null = the job has no yarn dyeing order: nothing is deducted.
            let startTime: number | null = null;

            if (ydItems.length > 0) {
                const created = Math.min(
                    ...ydItems.map((item) =>
                        new Date(item.workOrder.createdAt).getTime()
                    )
                );

                startTime = USE_DELIVERY_DATE ? startOfUtcDay(created) : created;
            }

            // Knitting deliveries made after the yarn dyeing order exists.
            const countedKnittingDeliveries =
                startTime === null
                    ? []
                    : knittingDeliveries.filter((delivery) => {
                          const stamp = new Date(
                              USE_DELIVERY_DATE
                                  ? delivery.deliveryDate
                                  : delivery.createdAt
                          ).getTime();

                          return stamp >= startTime!;
                      });

            // Original stock from the ydStock table.
            const openingStockQty = jobStockRows.reduce(
                (total, row) => total + toQty(row.yarnDyedStock),
                0
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

            // Information only (does not change the stock).
            const yarnReceivedGrey = sumDeliveryQty(
                ydDeliveries,
                STOCK_TYPES.YARN_RECEIVED_GREY
            );

            const finishReturnQty = sumDeliveryQty(
                ydDeliveries,
                STOCK_TYPES.FINISH_RETURN
            );

            // All knitting deliveries / returns of the job (information only).
            const yarnDeliveryQty = sumDeliveryQty(
                knittingDeliveries,
                STOCK_TYPES.YARN_DELIVERY
            );

            const yarnReturnQty = sumDeliveryQty(
                knittingDeliveries,
                STOCK_TYPES.YARN_RETURN
            );

            // Stock goes DOWN by Yarn Delivery (after the yd order was created).
            const deductedFromStockQty = sumDeliveryQty(
                countedKnittingDeliveries,
                STOCK_TYPES.YARN_DELIVERY
            );

            const returnedToStockQty = ADD_YARN_RETURN_TO_STOCK
                ? sumDeliveryQty(
                      countedKnittingDeliveries,
                      STOCK_TYPES.YARN_RETURN
                  )
                : 0;

            const receivedQty =
                finishReceivedQty +
                (COUNT_YARN_RECEIVED_FROM_YD ? yarnReceivedGrey : 0);

            const availableStock =
                openingStockQty +
                receivedQty -
                deductedFromStockQty +
                returnedToStockQty;

            // Knitting work order qty of the same job.
            const knittingWorkOrderQty = knittingItems.reduce(
                (total, item) => total + Number(item.workOrderQty || 0),
                0
            );

            const firstYd = ydItems[0];
            const firstStock = jobStockRows[0];

            // Colors come ONLY from the yarn dyeing order's yarnColors
            // (no duplicates, nothing from the ydStock rows).
            const colorMap = new Map<string, string>();

            for (const item of ydItems) {
                for (const yarnColor of item.yarnColors) {
                    const colorKey = normalize(yarnColor.color);

                    if (colorKey && !colorMap.has(colorKey)) {
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
                id: firstYd ? firstYd.id : `stock-${firstStock!.id}`,

                compositionIds: ydItems.map((item) => item.id),

                composition: firstYd
                    ? firstYd.composition
                    : firstStock!.composition,
                color: firstYd ? firstYd.color : firstStock!.color,

                compositions: [
                    ...ydItems.map((item) => ({
                        id: item.id,
                        composition: item.composition,
                        color: item.color,
                        workOrderQty: Number(item.workOrderQty || 0),
                    })),

                    ...jobStockRows.map((row) => ({
                        id: `stock-${row.id}`,
                        composition: row.composition,
                        color: row.color,
                        workOrderQty: 0,
                    })),
                ],

                workOrderQty: ydItems.reduce(
                    (total, item) => total + Number(item.workOrderQty || 0),
                    0
                ),

                machineDia: firstYd?.machineDia ?? null,
                lotNo: firstYd?.lotNo ?? firstStock?.dyedYarnLot ?? null,
                yarnCount: firstYd?.yarnCount ?? firstStock?.count ?? null,

                buyer: firstStock?.buyer ?? null,
                styleNo: firstStock?.styleNo ?? null,

                yarnColors: Array.from(colorMap.values()).map((color) => ({
                    color,
                })),

                workOrder: firstYd
                    ? { jobNo: firstYd.workOrder.jobNo }
                    : { jobNo: group.jobNo },

                // Original stock rows of this job (from the ydStock table).
                openingStocks: jobStockRows.map((row) => ({
                    id: row.id,
                    count: row.count,
                    composition: row.composition,
                    color: row.color,
                    dyedYarnLot: row.dyedYarnLot,
                    qty: round2(toQty(row.yarnDyedStock)),
                })),

                deliveries: allDeliveries,

                matchedKnittingCompositionIds: knittingItems.map(
                    (item) => item.id
                ),

                knittingWorkOrderQty: round2(knittingWorkOrderQty),

                stockSummary: {
                    openingStockQty: round2(openingStockQty),
                    yarnForDyeQty: round2(yarnForDyeQty),
                    finishReceivedQty: round2(finishReceivedQty),
                    yarnReceivedGrey: round2(yarnReceivedGrey),
                    finishReturnQty: round2(finishReturnQty),
                    yarnReturnQty: round2(yarnReturnQty),
                    yarnDeliveryQty: round2(yarnDeliveryQty),
                    deductedFromStockQty: round2(deductedFromStockQty),
                    knittingWorkOrderQty: round2(knittingWorkOrderQty),
                    knittingAwaitingQty: round2(
                        knittingWorkOrderQty - yarnDeliveryQty
                    ),
                    availableStock: round2(availableStock),
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