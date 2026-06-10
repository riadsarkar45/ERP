import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { successResponse, errorResponse } from "../../utils/responseHandler";

export const getAllJobs = async (req: Request, res: Response) => {
    try {
        const jobs = await prisma.jobs.findMany({
            include: {
                workOrders: true
            }
        });

        if (!jobs || jobs.length === 0) {
            return res.status(200).json(successResponse([], "No jobs found"));
        }

        res.status(200).json(successResponse(jobs, "Jobs fetched successfully"));
    } catch (error) {
        console.error("GetAllJobs error:", error);
        res.status(500).json(errorResponse("Failed to fetch jobs"));
    }
};