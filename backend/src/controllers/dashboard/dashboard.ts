import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const dashboardController = async (req: Request, res: Response) => {
    const jobs = await prisma.workOrder.findMany(
        {
            select:{
                orderType: true,
            }
        }
    )
    res.send(jobs)
}