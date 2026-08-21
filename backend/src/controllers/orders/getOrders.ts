// ============================================================================
// workOrderFiltering.combined.ts
// Matches the actual schema.prisma provided (WorkOrder, Composition,
// StyleRequirement, yarnDyeingJobs, jobs). Split into
// utils/workOrderFilters.ts and controllers/workOrder.controller.ts later.
// ============================================================================

import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";
import { calculateYarnCompStat } from "../../utils/yarnCompStat";

type FilterLevel = "workOrder" | "styleRequirement" | "composition" | "yarnDyeingJob";

interface FieldMapping {
    level: FilterLevel;
    dbColumn: string;
}

const FIELD_MAP: Record<string, FieldMapping> = {
    jobNo: { level: "workOrder", dbColumn: "jobNo" },
    factoryName: { level: "workOrder", dbColumn: "factoryName" },
    workOrderNo: { level: "workOrder", dbColumn: "workOrderNo" },
    styleNo: { level: "workOrder", dbColumn: "styleNo" },
    month: { level: "workOrder", dbColumn: "month" },
    buyerName: { level: "styleRequirement", dbColumn: "buyerName" },
    composition: { level: "composition", dbColumn: "composition" },
    color: { level: "composition", dbColumn: "color" },
    orderQty: { level: "composition", dbColumn: "orderQty" },
    workOrderQty: { level: "composition", dbColumn: "workOrderQty" },
    unitePrice: { level: "composition", dbColumn: "unitePrice" },
    bookingColor: { level: "yarnDyeingJob", dbColumn: "color" },
};

export const buildWorkOrderWhere = (
    orderType: string,
    filters: Record<string, string[]>
): Prisma.WorkOrderWhereInput => {
    
    const where: Prisma.WorkOrderWhereInput = { orderType };
    const compositionFilters: Prisma.CompositionWhereInput = {};
    // const yarnDyeingFilters: Prisma.yarnDyeingJobsWhereInput = {};
    let styleRequirementFilters: Prisma.StyleRequirementWhereInput = {};

    for (const [key, values] of Object.entries(filters)) {
        if (!values?.length) continue;
        const mapping = FIELD_MAP[key];
        if (!mapping) continue;
        const { level, dbColumn } = mapping;

        switch (level) {
            case "workOrder":
                (where as any)[dbColumn] = { in: values };
                break;
            case "styleRequirement":
                styleRequirementFilters = { ...styleRequirementFilters, [dbColumn]: { in: values } };
                break;
            case "composition":
                (compositionFilters as any)[dbColumn] = { in: values };
                break;
            // case "yarnDyeingJob":
            //     (yarnDyeingFilters as any)[dbColumn] = { in: values };
            //     break;
        }
    }

    if (Object.keys(styleRequirementFilters).length) {
        where.styleRequirement = { is: styleRequirementFilters };
    }
    if (Object.keys(compositionFilters).length) {
        where.compositions = { some: compositionFilters };
    }
    // if (Object.keys(yarnDyeingFilters).length) {
    //     where.yarnDyeingJobs = { some: yarnDyeingFilters };
    // }

    return where;
};

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { orderType } = req.params as { orderType: string };
        if (!orderType) {
            return res.status(400).json({ type: "error", message: "orderType is required" });
        }

        // const page = Math.max(1, Number(req.query.page) || 1);
        // const limit = Math.max(1, Number(req.query.limit) || 50);
        // const skip = (page - 1) * limit;

        let filters: Record<string, string[]> = {};
        if (typeof req.query.filters === "string") {
            try { filters = JSON.parse(req.query.filters); } catch { /* ignore malformed */ }
        }

        const workOrderWhere = buildWorkOrderWhere(orderType, filters);

        const where: Prisma.jobsWhereInput = {
            workOrders: { some: workOrderWhere },
        };

        const [jobsResult, total] = await Promise.all([
            prisma.jobs.findMany({
                where,
                // skip,

                take: 40,
                select: {
                    jobNo: true,
                    createdAt: true,
                    workOrders: {
                        where: workOrderWhere,
                        select: {
                            id: true,
                            workOrderNo: true,
                            workOrderPlaceDate: true,
                            month: true,
                            styleNo: true,
                            lotNo: true,
                            orderType: true,
                            factoryName: true,
                            
                            compositions: {
                                select: {
                                    id: true,
                                    composition: true,
                                    color: true,
                                    orderQty: true,
                                    workOrderQty: true,
                                    unitePrice: true,
                                    deliveries: {
                                        select: { id: true, deliveryQty: true, deliveryType: true },
                                    },
                                },
                            },
                            styleRequirement: {
                                select: {
                                    processLoss: true,
                                    buyerName: true,
                                    styleNo: true,
                                    rows: {
                                        select: {
                                            color: true,
                                            composition: true,
                                            orderQty: true,
                                            finishRequiredQty: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.jobs.count({ where }),
        ]);

        if (jobsResult.length === 0) {
            return res.status(404).json({ type: "error", message: "No factory order details found" });
        }

        // 🔥 UNCOMMENTED: this was disabled before, so delivery stats (including
        // Grey Return) were never being computed and attached to the response at all.
        const statsResult = calculateYarnCompStat(jobsResult);

        return res.status(200).json({
            type: "success",
            data: statsResult,
            // pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};

export const getFilterOptions = async (req: Request, res: Response) => {
    try {
        const { orderType, column } = req.params as { orderType: string; column: string };

        const mapping = FIELD_MAP[column];
        if (!mapping) {
            return res.status(400).json({ type: "error", message: `Unknown filter column: ${column}` });
        }
        const { level, dbColumn } = mapping;

        let otherFilters: Record<string, string[]> = {};
        if (typeof req.query.filters === "string") {
            try { otherFilters = JSON.parse(req.query.filters); } catch { /* ignore malformed */ }
        }
        delete otherFilters[column];

        const workOrderWhere = buildWorkOrderWhere(orderType, otherFilters);

        let values: string[] = [];

        switch (level) {
            case "workOrder": {
                const rows = await prisma.workOrder.findMany({
                    where: workOrderWhere,
                    select: { [dbColumn]: true } as any,
                    distinct: [dbColumn as any],
                });
                values = rows.map(r => (r as any)[dbColumn]).filter(v => v != null).map(String);
                break;
            }

            case "styleRequirement": {
                const rows = await prisma.styleRequirement.findMany({
                    where: {
                        workOrders: { some: workOrderWhere },
                    } as Prisma.StyleRequirementWhereInput,
                    select: { [dbColumn]: true } as any,
                    distinct: [dbColumn as any],
                });
                values = rows.map(r => (r as any)[dbColumn]).filter(v => v != null && v !== "").map(String);
                break;
            }

            case "composition": {
                const rows = await prisma.composition.findMany({
                    where: {
                        workOrder: workOrderWhere,
                    } as Prisma.CompositionWhereInput,
                    select: { [dbColumn]: true } as any,
                    distinct: [dbColumn as any],
                });
                values = rows.map(r => (r as any)[dbColumn]).filter(v => v != null && v !== "").map(String);
                break;
            }

            // case "yarnDyeingJob": {
            //     const rows = await prisma.yarnDyeingJobs.findMany({
            //         where: {
            //             workOrder: workOrderWhere,
            //         } as Prisma.yarnDyeingJobsWhereInput,
            //         select: { [dbColumn]: true } as any,
            //         distinct: [dbColumn as any],
            //     });
            //     values = rows.map(r => (r as any)[dbColumn]).filter(v => v != null && v !== "").map(String);
            //     break;
            // }
        }

        const sorted = values.sort((a, b) => {
            const na = Number(a), nb = Number(b);
            return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
        });

        return res.status(200).json({ type: "success", data: sorted });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};