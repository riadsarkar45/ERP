import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const updateJobStatus = async (req: Request, res: Response) => {
    const { status, jobId } = req.params as { status: string, jobId: string };
    console.log("req.params");
    if (!status || !jobId) {
        return res.send({ message: "Something went wrong", type: "error" })
    }

    const checkIfJobExist = await prisma.job.findUnique(
        {
            where: { id: Number(jobId) }
        }
    )

    if (!checkIfJobExist) {
        return res.send({ message: "No data found to update", type: "error" })
    }

    const update = await prisma.job.update(
        {
            where: { id: Number(jobId) },
            data: {
                status: status
            }
        }
    )

    if (!update) {
        return res.send({ message: "Failed to update", type: "error" })
    }

    res.status(201).send({ message: "Update successful", type: "success" })
}