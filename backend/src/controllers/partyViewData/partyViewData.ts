import type { Request, Response } from "express";
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

export const partyData = async (req: Request, res: Response) => {
    const { orderType, factoryName } = req.params as {
        orderType: string | undefined;
        factoryName: string | undefined;
    };

    // Build the WorkOrder filter from whichever params were actually given.
    const whereClause: any = {};
    if (orderType) {
        whereClause.orderType = { equals: orderType.trim(), mode: "insensitive" };
    }
    if (factoryName) {
        whereClause.factoryName = { equals: factoryName.trim(), mode: "insensitive" };
    }
    const hasFilter = Object.keys(whereClause).length > 0;

    const styles = await prisma.styleRequirement.findMany({
        where: hasFilter
            ? { workOrders: { some: whereClause } }
            : {},
        orderBy: { id: "asc" },
        select: {
            jobNo: true,
            id: true,
            rows: {
                select: {
                    id: true,
                    composition: true,
                }
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
                                }
                            },
                        }
                    },
                }
            }
        }
    });

    if (styles.length === 0) {
        return res.status(404).send({ message: "No style requirements found", type: "error" });
    }

    const grouped = getDeliveryBreakdownByType(styles);

    res.status(200).send({ data: grouped, type: "success" });
};

