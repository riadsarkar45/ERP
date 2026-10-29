import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const addNewContractualJob = async (req: Request, res: Response) => {

    const { jobNo, date, lineNo, compositionId, processType, input, output } = req.body

    // console.log(req.body, "requested body");

    if (!req.body) {
        return res.status(404).send({ message: "Missing Required fields" });
    }

    try {
        const findUniqueJobId = await prisma.styleRequirementRow.findUnique({ where: { id: Number(compositionId) }, select: { id: true, } })

        const findJobs = await prisma.jobs.findUnique({ where: { jobNo: jobNo }, select: { id: true, } })

        const findProcessTypes = await prisma.processTypes.findUnique({ where: { processType: processType }, select:{id: true, processRate: true} })

        if (!findUniqueJobId?.id || !findJobs?.id || !findProcessTypes) {
            return res.status(404).send({ message: "Missing required fields." })
        }

        const createContractualJob = await prisma.contractualJobs.create(
            {
                data: {
                    jobId: Number(findJobs.id),
                    date: new Date(date),
                    lineNo: lineNo,
                    processType: processType,
                    processRate: findProcessTypes.processRate,
                    input: String(input),
                    output: String(output),
                    styleRequirementRowId: Number(findUniqueJobId.id)
                }
            }
        )

        if (!createContractualJob) {
            return res.status(204).send({ message: "Failed to create contractual job" })
        }

        return res.status(200).send({ message: "Contractual job created" })
    } catch (e) {
        console.log(e);
        res.status(500).send({ message: "Something went wrong. Please try again later." })
    }
}