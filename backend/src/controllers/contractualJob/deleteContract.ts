import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const deleteContractualJobs = async (req: Request, res: Response) => {

    const { jobId } = req.params;

    if (!jobId) {
        return res.status(400).send({ message: "Missing Required fields", type: "error" });

    }

    try {

        const findJobId = await prisma.contractualJobs.findUnique(
            {
                where: { id: Number(jobId) },
                select: { id: true }
            }
        )

        if (!findJobId?.id) {
            return res.status(404).send({ message: "Job not found", type: "error" })
        }

        const deleteJob = await prisma.contractualJobs.delete(
            {
                where: { id: Number(findJobId.id) }
            }
        )

        if (!deleteJob) {
            return res.status(400).send({ message: "Failed to delete job", type: "error" })
        }

        return res.status(200).send({ message: "Job deleted successfully", type: "success" })
    } catch (e) {
        console.log(e)
        return res.status(400).send({ message: "Something went wrong. Please try again later", type: "error" })
    }

}