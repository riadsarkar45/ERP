import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { jobsByType } from "../../helpers/dashboard-data/dashboard";

export const dashboardController = async (req: Request, res: Response) => {
    try {
        const jobs = await prisma.workOrder.findMany({
            select: { orderType: true },
        });
        const jobsType = jobsByType(jobs);
        return res.json(jobsType);
    } catch (error) {
        console.error("Dashboard error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};