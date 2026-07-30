import prisma from "../../database/prismaClient/prisma";
import { getJobWiseGlanceTotals } from "../../utils/yarnCompStat";
import type { Request, Response } from "express";

const normalizeParam = (param: string | string[] | undefined): string | undefined => {
    if (!param) return undefined;
    const value = Array.isArray(param) ? param[0] : param;
    if (!value) return undefined;
    return value.trim();
};

export const glanceReport = async (req: Request, res: Response) => {
    const { factoryName, orderType } = req.params;
    const factoryNameValue = normalizeParam(factoryName);
    const orderTypeValue = normalizeParam(orderType);

    const whereClause: any = {};
    if (orderTypeValue) whereClause.orderType = { equals: orderTypeValue, mode: "insensitive" };
    if (factoryNameValue) whereClause.factoryName = { equals: factoryNameValue, mode: "insensitive" };

    const styles = await prisma.styleRequirement.findMany({
        where: { workOrders: { some: whereClause } },
        orderBy: { id: "asc" },
        select: {
            jobNo: true,
            id: true,
            workOrders: {
                where: whereClause,
                select: {
                    factoryName: true,
                    compositions: {
                        select: {
                            workOrderQty: true,
                            unitePrice: true,
                            deliveries: {
                                select: { deliveryType: true, deliveryQty: true }
                            }
                        }
                    }
                }
            }
        }
    });

    // Use the new job-wise aggregation function
    const jobWiseData = getJobWiseGlanceTotals(styles);

    res.status(200).send({ data: jobWiseData, type: "success" });
};