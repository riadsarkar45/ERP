import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { jobsByDate, jobsByType } from "../../helpers/dashboard-data/dashboard";

export const dashboardController = async (req: Request, res: Response) => {
    try {
        const jobs = await prisma.workOrder.findMany({
            select: {
                orderType: true,
                workOrderPlaceDate: true,
                compositions: {
                    select: {
                        workOrderQty: true,
                        composition: true,
                    }
                }
            },
        });
        const jobsType = jobsByType(jobs);
        const jobsDate = await jobsByDate(jobs);
        return res.send({jobsType, jobsDate});
    } catch (error) {
        console.error("Dashboard error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};