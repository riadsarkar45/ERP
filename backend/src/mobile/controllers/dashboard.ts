import type { Request, Response } from "express";
import { completedJobs, workOrders } from "../functions/workOrders";

export const mobileDashboard = async (req: Request, res: Response) => {
    try {
        const [workOrderStats, shippedJobs] = await Promise.all([
            workOrders(),
            completedJobs(),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                allWorkOrders: workOrderStats.jobs,
                allPendingApprovalJobs: workOrderStats.pendingApprovalJobs,
                shippedJobs,
            },
        });
    } catch (error) {
        console.error("Mobile dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard data",
        });
    }
};