import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";
import { calculateYarnCompStat } from "../../utils/yarnCompStat";
import { buildJobWhere, buildWorkOrderWhere } from "./workOrderFilter";

export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const { orderType } = req.params as { orderType: string };
        if (!orderType) {
            return res.status(400).json({ type: "error", message: "orderType is required" });
        }

        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.max(1, Number(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        // filters sent as a JSON-encoded query param: ?filters={"factoryName":["A","B"]}
        let filters: Record<string, string[]> = {};
        if (typeof req.query.filters === "string") {
            try { filters = JSON.parse(req.query.filters); } catch { /* ignore malformed */ }
        }

        const workOrderWhere = buildWorkOrderWhere(orderType, filters);
        const jobWhere = buildJobWhere(filters);

        const where = {
            ...jobWhere,
            workOrders: { some: workOrderWhere },
        };

        const [jobs, total] = await Promise.all([
            prisma.jobs.findMany({
                where,
                skip,
                take: limit,
                select: {
                    jobNo: true,
                    createdAt: true,
                    workOrders: {
                        where: workOrderWhere, // same filter applied to the nested select, not just the existence check
                        select: {
                            id: true, workOrderNo: true, workOrderPlaceDate: true, month: true,
                            styleNo: true, lotNo: true, orderType: true, factoryName: true,
                            yarnDyeingJobs: { select: { id: true, qty: true, color: true, composition: true } },
                            compositions: {
                                select: {
                                    id: true, composition: true, color: true, orderQty: true,
                                    workOrderQty: true, unitePrice: true,
                                    deliveries: { select: { id: true, deliveryQty: true, deliveryType: true } },
                                },
                            },
                            styleRequirement: {
                                select: {
                                    processLoss: true, buyerName: true, styleNo: true,
                                    rows: { select: { color: true, composition: true, orderQty: true, finishRequiredQty: true } },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.jobs.count({ where }),
        ]);

        if (jobs.length === 0) {
            return res.status(404).json({ type: "error", message: "No factory order details found" });
        }

        const comptStats = calculateYarnCompStat(jobs);

        return res.status(200).json({
            type: "success",
            data: comptStats,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};