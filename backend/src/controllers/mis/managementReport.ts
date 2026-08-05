import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { managementViewData } from "./dataStructer";

const DEFAULT_LIMIT = 30;

export const managementReport = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType?: string };
    const { page = "1", limit = String(DEFAULT_LIMIT), jobNo } = req.query as {
        page?: string;
        limit?: string;
        jobNo?: string; // comma-separated list of selected job numbers
    };

    if (!orderType) {
        return res.status(400).send({ message: "Order Type is missing" });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT);

    const selectedJobNos = jobNo
        ? jobNo.split(",").map((j) => j.trim()).filter(Boolean)
        : [];
    const hasFilter = selectedJobNos.length > 0;

    const whereClause = hasFilter ? { jobNo: { in: selectedJobNos } } : {};

    const [jobs, totalCount] = await Promise.all([
        prisma.jobs.findMany({
            where: whereClause,
            select: {
                jobNo: true,
                workOrders: {
                    where: { orderType },
                    select: {
                        compositions: {
                            select: {
                                workOrderQty: true,
                                deliveries: {
                                    select: {
                                        deliveryQty: true,
                                        deliveryType: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { jobNo: "asc" },
            ...(hasFilter ? {} : { skip: (pageNum - 1) * limitNum, take: limitNum }),
        }),
        prisma.jobs.count({ where: whereClause }),
    ]);

    if (!jobs) {
        return res.status(404).send({ message: "No data found", type: "error" });
    }

    const structuredData = managementViewData(jobs);

    res.send({
        data: structuredData,
        totalCount,
        page: pageNum,
        limit: hasFilter ? totalCount : limitNum,
        hasMore: hasFilter ? false : pageNum * limitNum < totalCount,
    });
};

export const getJobNumbers = async (_req: Request, res: Response) => {
    const jobs = await prisma.jobs.findMany({
        select: { jobNo: true },
        orderBy: { jobNo: "asc" },
    });

    res.send({ jobNumbers: jobs.map((j) => j.jobNo) });
};