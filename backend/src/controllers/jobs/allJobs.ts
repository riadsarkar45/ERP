import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getAllJobs = async (req: Request, res: Response) => {
    try {
        const allJobs = await prisma.job.findMany(
            {
                orderBy: {id: "desc"},
                select: {
                    id: true,
                    buyer: true,
                    jobNo: true,
                    style: true,
                    poNo: true,
                    createdAt: true,
                    status: true,
                }
            }
        )

        if (!allJobs) {
            return res.status(404).send({ message: "No jobs found", type: "error" })
        }
        res.status(200).send(allJobs)
    } catch (e) {
        console.log(e);
    }
}