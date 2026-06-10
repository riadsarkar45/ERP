import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { successResponse, errorResponse, validationError } from "../../utils/responseHandler";

export const updateJobStatus = async (req: Request, res: Response) => {
    const { status, jobId } = req.params as { status: string, jobId: string };

    try {
        if (!status || !jobId) {
            return res.status(400).json(validationError("Status and job ID are required"));
        }

        const jobExists = await prisma.jobs.findUnique({
            where: { id: Number(jobId) }
        });

        if (!jobExists) {
            return res.status(404).json(errorResponse("Job not found"));
        }

        const updated = await prisma.jobs.findUnique({
            where: { id: Number(jobId) }
        });

        res.status(200).json(successResponse(updated, "Job retrieved successfully"));
    } catch (error) {
        console.error("UpdateJobStatus error:", error);
        res.status(500).json(errorResponse("Failed to update job status"));
    }
};