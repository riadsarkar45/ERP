import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getContractualJobs = async (req: Request, res: Response) => {

    const jobs = await prisma.contractualJobs.findMany(
        {
            select: {
                id: true,
                date: true,
                input: true,
                output: true,
                processType: true,
                lineNo: true,
                processRate: true,
                jobs: {
                    select: {
                        jobNo: true,
                    }
                },
                styleReqRows: {
                    select: {
                        orderQty: true,
                        styleRequirement: {
                            select: {
                                styleNo: true,
                            }
                        }
                    }
                }
            }
        }
    )

    if (!jobs) {
        return res.status(404).send({ message: "No job found", type: "error" })
    }

    return res.status(200).send(jobs)

}