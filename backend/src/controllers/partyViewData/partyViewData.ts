
    import type { Request, Response } from "express";
    import { Prisma } from "@prisma/client";
    import prisma from "../../database/prismaClient/prisma";
    import { getDeliveryBreakdownByType, getUniqueFactoryNames } from "../../utils/yarnCompStat";

    export const partyViewData = async (req: Request, res: Response) => {
        const { factoryName } = req.params as { factoryName: string | undefined };


        // Case-insensitive + trimmed match, since Postgres string equality is
        // case-sensitive by default and factoryName may have inconsistent casing
        // or stray whitespace depending on how it was entered/uploaded.
        const whereClause: any = factoryName
            ? { orderType: { equals: factoryName.trim(), mode: "insensitive" } }
            : {};

        // Temporary sanity check — remove once matching is confirmed working.
        const distinctFactories = await prisma.workOrder.findMany({
            select: { factoryName: true },
            distinct: ["factoryName"],
        });

        // We fetch ALL styles here so the frontend can filter the ENTIRE dataset perfectly.
        // The frontend will handle the pagination to prevent rendering lag.
        const styles = await prisma.styleRequirement.findMany({
            where: factoryName
                ? { workOrders: { some: whereClause } }
                : {},
            orderBy: { id: "asc" },
            select: {
                workOrders: {
                    where: whereClause,
                    select: {
                        factoryName: true,
                        
                    }
                }
            }
        });

        if (styles.length === 0) {
            return res.status(404).send({ message: "No style requirements found", type: "error" });
        }

        // const summaryData = calculateOrdersForStyleSummary(styles);
        // const deliveryBreakDown = getDeliveryBreakdownByType(styles)
        const factoryNames = getUniqueFactoryNames(styles)
        res.status(200).send({
            factoryNames:factoryNames,
            type: "success"
        });
    };


    // ============================================
    // PARTY DATA
    // ============================================

    export const partyData = async (req: Request, res: Response) => {
        try {
            const { orderType, factoryName } = req.params as {
                orderType?: string;
                factoryName?: string;
            };

            const whereClause: any = {};

            if (orderType?.trim()) {
                whereClause.orderType = {
                    equals: orderType.trim(),
                    mode: "insensitive",
                };
            }

            if (factoryName?.trim()) {
                whereClause.factoryName = {
                    equals: factoryName.trim(),
                    mode: "insensitive",
                };
            }

            const hasFilter = Object.keys(whereClause).length > 0;

            const styles = await prisma.styleRequirement.findMany({
                where: hasFilter
                    ? {
                        workOrders: {
                            some: whereClause,
                        },
                    }
                    : {},

                orderBy: {
                    id: "asc",
                },

                select: {
                    jobNo: true,
                    id: true,

                    rows: {
                        select: {
                            id: true,
                            composition: true,
                        },
                    },

                    workOrders: {
                        where: hasFilter ? whereClause : undefined,

                        select: {
                            orderType: true,
                            factoryName: true,

                            compositions: {
                                select: {
                                    workOrderQty: true,
                                    additional: true,
                                    unitePrice: true,

                                    deliveries: {
                                        select: {
                                            deliveryType: true,
                                            deliveryQty: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (styles.length === 0) {
                return res.status(404).send({
                    message: "No style requirements found",
                    type: "error",
                });
            }

            // Existing function is used here
            const grouped = getDeliveryBreakdownByType(styles);

            return res.status(200).send({
                data: grouped,
                type: "success",
            });

        } catch (error) {
            console.error("Party Data Error:", error);

            return res.status(500).send({
                message: "Failed to fetch party data",
                type: "error",
            });
        }
    };


    // ============================================
    // PARTY WISE STOCK DATA
    // ============================================


    // ============================================
    // FACTORY-WISE DELIVERY AGGREGATION
    // ============================================

    // ============================================
    // DATE / MONTH HELPERS
    // ============================================

    const MONTH_SHORT = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    const pad2 = (n: number) => String(n).padStart(2, "0");

    // Any date-like value -> "YYYY-MM-DD" (or null)
    const toYmd = (value: unknown): string | null => {
        if (value === null || value === undefined || value === "") return null;

        if (value instanceof Date) {
            if (isNaN(value.getTime())) return null;
            return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
        }

        const str = String(value).trim();
        if (!str) return null;

        // YYYY-MM-DD (with or without time)
        let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;

        // DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY
        m = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
        if (m) return `${m[3]}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;

        const parsed = new Date(str);
        if (isNaN(parsed.getTime())) return null;
        return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
    };

    // "2026-09", "Sep'26", "SEP-26", "September 2026" -> "YYYY-MM"
    const toMonthKey = (value: unknown): string | null => {
        if (value === null || value === undefined) return null;
        const str = String(value).trim();
        if (!str) return null;

        let m = str.match(/^(\d{4})-(\d{1,2})$/);
        if (m) return `${m[1]}-${pad2(Number(m[2]))}`;

        m = str.match(/^([A-Za-z]{3,9})\W*(\d{2}|\d{4})$/);
        if (m) {
            const idx = MONTH_SHORT.findIndex(
                (x) => x.toLowerCase() === m![1]!.slice(0, 3).toLowerCase()
            );
            if (idx >= 0) {
                const year = m[2]!.length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
                return `${year}-${pad2(idx + 1)}`;
            }
        }
        return null;
    };

    const monthLabel = (key: string) => {
        const [y = "", m] = key.split("-");
        return `${MONTH_SHORT[Number(m) - 1]}'${y.slice(2)}`;
    };

    type DeliveryFilter = {
        from: string | null;
        to: string | null;
        months: Set<string>;
    };

    // ============================================
    // FACTORY-WISE BREAKDOWN
    // ============================================

    const getFactoryWiseDeliveryBreakdown = (
        styles: any[],
        filter: DeliveryFilter
    ) => {

        type FactoryStock = {
            factoryName: string;
            orderTypes: Set<string>;
            jobNos: Set<string>;
            deliveryTotals: Record<string, Prisma.Decimal>;
            grandTotal: Prisma.Decimal;
            totalDeliveries: number;
        };

        const factoryMap = new Map<string, FactoryStock>();

        // Delivery IDs are globally unique.
        // Prevent accidental duplicate counting.
        const processedDeliveryIds = new Set<string>();

        const hasDateFilter = !!(filter.from || filter.to);
        const hasMonthFilter = filter.months.size > 0;
        const hasAnyFilter = hasDateFilter || hasMonthFilter;

        // every month that has a delivery (ignores the date/month filter)
        const allMonthKeys = new Set<string>();

        for (const style of styles) {

            for (const workOrder of style.workOrders ?? []) {

                // Normalize factory name
                const factoryName = String(
                    workOrder.factoryName ?? ""
                ).trim().replace(/\s+/g, " ");

                // Do not silently discard records with missing factory names
                if (!factoryName) {
                    throw new Error(
                        `Missing factory name in Work Order ID: ${workOrder.id}`
                    );
                }

                // Case-insensitive factory uniqueness
                const factoryKey = factoryName.toLowerCase();

                if (!factoryMap.has(factoryKey)) {
                    factoryMap.set(factoryKey, {
                        factoryName,
                        orderTypes: new Set<string>(),
                        jobNos: new Set<string>(),
                        deliveryTotals: {},
                        grandTotal: new Prisma.Decimal(0),
                        totalDeliveries: 0,
                    });
                }

                const factory = factoryMap.get(factoryKey)!;

                // Without a filter keep the original behaviour.
                // With a filter these are added only when a delivery matches.
                if (!hasAnyFilter) {
                    if (workOrder.orderType) {
                        factory.orderTypes.add(workOrder.orderType.trim());
                    }
                    if (style.jobNo) {
                        factory.jobNos.add(style.jobNo);
                    }
                }

                for (const composition of workOrder.compositions ?? []) {

                    for (const delivery of composition.deliveries ?? []) {

                        // ==================================
                        // DUPLICATE DELIVERY PROTECTION
                        // ==================================

                        const deliveryId = String(delivery.id);

                        if (
                            delivery.id === null ||
                            delivery.id === undefined ||
                            processedDeliveryIds.has(deliveryId)
                        ) {
                            continue;
                        }

                        processedDeliveryIds.add(deliveryId);

                        // ==================================
                        // DATE / MONTH FILTER
                        // ==================================

                        const ymd = toYmd(delivery.deliveryDate);
                        const monthKey = ymd
                            ? ymd.slice(0, 7)
                            : toMonthKey(delivery.deliveryMonth);

                        if (monthKey) allMonthKeys.add(monthKey);

                        if (hasDateFilter) {
                            if (!ymd) continue;
                            if (filter.from && ymd < filter.from) continue;
                            if (filter.to && ymd > filter.to) continue;
                        }

                        if (
                            hasMonthFilter &&
                            (!monthKey || !filter.months.has(monthKey))
                        ) {
                            continue;
                        }

                        if (hasAnyFilter) {
                            if (workOrder.orderType) {
                                factory.orderTypes.add(workOrder.orderType.trim());
                            }
                            if (style.jobNo) {
                                factory.jobNos.add(style.jobNo);
                            }
                        }

                        // ==================================
                        // DELIVERY TYPE NORMALIZATION
                        // ==================================

                        const rawDeliveryType = String(
                            delivery.deliveryType ?? ""
                        ).trim().replace(/\s+/g, " ");

                        const deliveryType = rawDeliveryType || "Unknown";

                        const deliveryTypeKey = deliveryType.toLowerCase();

                        // Preserve the first encountered display name
                        const existingType = Object.keys(
                            factory.deliveryTotals
                        ).find(
                            type => type.toLowerCase() === deliveryTypeKey
                        );

                        const finalDeliveryType = existingType || deliveryType;

                        // ==================================
                        // DECIMAL-SAFE QUANTITY CALCULATION
                        // ==================================

                        let quantity: Prisma.Decimal;

                        try {
                            quantity = new Prisma.Decimal(
                                delivery.deliveryQty?.toString()
                            );
                        } catch {
                            throw new Error(
                                `Invalid delivery quantity. Delivery ID: ${deliveryId}`
                            );
                        }

                        if (!quantity.isFinite()) {
                            throw new Error(
                                `Non-finite delivery quantity. Delivery ID: ${deliveryId}`
                            );
                        }

                        // Initialize delivery type
                        if (!factory.deliveryTotals[finalDeliveryType]) {
                            factory.deliveryTotals[finalDeliveryType] =
                                new Prisma.Decimal(0);
                        }

                        // Add delivery quantity
                        factory.deliveryTotals[finalDeliveryType] =
                            factory.deliveryTotals[finalDeliveryType].plus(quantity);

                        // Add factory grand total
                        factory.grandTotal =
                            factory.grandTotal.plus(quantity);

                        factory.totalDeliveries++;
                    }
                }
            }
        }

        // ==================================
        // FINAL DATA FORMATTING
        // ==================================

        const factories = Array.from(factoryMap.values())
            // with a date/month filter hide factories that have nothing in that period
            .filter(factory => !hasAnyFilter || factory.totalDeliveries > 0)
            .map(factory => {

                const deliveryTotals: Record<string, string> = {};

                for (const [type, quantity] of Object.entries(
                    factory.deliveryTotals
                )) {
                    deliveryTotals[type] = quantity.toString();
                }

                return {
                    factoryName: factory.factoryName,

                    orderTypes: Array.from(factory.orderTypes),

                    jobNos: Array.from(factory.jobNos),

                    deliveryTotals,

                    grandTotal: factory.grandTotal.toString(),

                    totalDeliveries: factory.totalDeliveries,
                };
            });

        const months = Array.from(allMonthKeys)
            .sort()
            .map(key => ({ key, label: monthLabel(key) }));

        return { factories, months };
    };


    // ============================================
    // PARTY WISE STOCK DATA CONTROLLER
    // ============================================

    export const partyWiseStockData = async (
        req: Request,
        res: Response
    ) => {
        try {

            const { orderType, factoryName } = req.params as {
                orderType?: string;
                factoryName?: string;
            };

            // ==================================
            // DATE / MONTH QUERY PARAMS
            // ==================================

            const query = req.query as {
                fromDate?: string;
                toDate?: string;
                months?: string;
            };

            const rawFrom = String(query.fromDate ?? "").trim();
            const rawTo = String(query.toDate ?? "").trim();
            const rawMonths = String(query.months ?? "").trim();

            const from = rawFrom ? toYmd(rawFrom) : null;
            const to = rawTo ? toYmd(rawTo) : null;

            if (rawFrom && !from) {
                return res.status(400).send({
                    message: "Invalid fromDate",
                    type: "error",
                });
            }

            if (rawTo && !to) {
                return res.status(400).send({
                    message: "Invalid toDate",
                    type: "error",
                });
            }

            if (from && to && from > to) {
                return res.status(400).send({
                    message: "fromDate cannot be after toDate",
                    type: "error",
                });
            }

            const monthKeys = rawMonths
                ? rawMonths
                    .split(",")
                    .map((m) => toMonthKey(m.trim()))
                    .filter((m): m is string => !!m)
                : [];

            const deliveryFilter: DeliveryFilter = {
                from,
                to,
                months: new Set(monthKeys),
            };

            // ==================================
            // BUILD FILTER
            // ==================================

            const whereClause: any = {};

            if (orderType?.trim()) {
                whereClause.orderType = {
                    equals: orderType.trim(),
                    mode: "insensitive",
                };
            }

            if (factoryName?.trim()) {
                whereClause.factoryName = {
                    equals: factoryName.trim(),
                    mode: "insensitive",
                };
            }

            const hasFilter = Object.keys(whereClause).length > 0;

            // ==================================
            // DATABASE QUERY
            // ==================================

            const styles = await prisma.styleRequirement.findMany({

                where: hasFilter
                    ? {
                        workOrders: {
                            some: whereClause,
                        },
                    }
                    : {},

                orderBy: {
                    id: "asc",
                },

                select: {
                    id: true,
                    jobNo: true,

                    workOrders: {
                        where: hasFilter ? whereClause : undefined,

                        select: {
                            id: true,
                            orderType: true,
                            factoryName: true,

                            compositions: {
                                select: {
                                    id: true,
                                    workOrderQty: true,
                                    additional: true,
                                    unitePrice: true,

                                    deliveries: {
                                        select: {
                                            id: true,
                                            deliveryType: true,
                                            deliveryQty: true,
                                            deliveryDate: true,
                                            deliveryMonth: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            // ==================================
            // FACTORY-WISE AGGREGATION (with date / month filter)
            // ==================================

            const { factories: grouped, months } =
                getFactoryWiseDeliveryBreakdown(styles, deliveryFilter);

            // ==================================
            // OVERALL GRAND TOTAL
            // ==================================

            const overallGrandTotal = grouped.reduce(
                (total, factory) =>
                    total.plus(factory.grandTotal),
                new Prisma.Decimal(0)
            );

            // ==================================
            // RESPONSE
            // ==================================

            return res.status(200).send({
                data: grouped,

                // all available months (not affected by the date filter)
                months,

                filters: {
                    fromDate: from,
                    toDate: to,
                    months: monthKeys,
                },

                totalFactories: grouped.length,

                grandTotal: overallGrandTotal.toString(),

                type: "success",
            });

        } catch (error) {

            console.error("Party Wise Stock Data Error:", error);

            return res.status(500).send({
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to fetch party wise stock data",

                type: "error",
            });
        }
    };

