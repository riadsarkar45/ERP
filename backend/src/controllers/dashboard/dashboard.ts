import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { jobsByType } from "../../helpers/dashboard-data/dashboard";

export const dashboardController = async (req: Request, res: Response) => {
    const jobs = await prisma.workOrder.findMany(
        {
            select:{
                orderType: true,
            }
        }
    )
    const jobsType = jobsByType(jobs);
    console.log(jobsType, "jobType");
    return res.json( jobsType );
}