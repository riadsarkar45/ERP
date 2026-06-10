import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { successResponse, errorResponse } from "../../utils/responseHandler";

export const dashboardController = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.workOrder.findMany({
      select: {
        orderType: true,
      }
    });

    res.status(200).json(successResponse(jobs, "Dashboard data fetched"));
  } catch (error) {
    console.error("Dashboard controller error:", error);
    res.status(500).json(errorResponse("Failed to fetch dashboard data"));
  }
};