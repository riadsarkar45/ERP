import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getContractJob = async (req: Request, res: Response) => {
    const { jobNo } = req.query;

    if (!jobNo) {
        return res.status(404).send({ message: "Missing required field", type: "error" })
    }

    try {
        const searchJob = await prisma.styleRequirement.findMany(
            {
                where: {
                    jobNo: {
                        contains: String(jobNo)
                    }
                },

                select: {
                    jobNo: true,
                    styleNo: true,
                    rows: {
                        select: {
                            orderQty: true,
                            composition: true,
                            id: true,
                        }
                    }
                }
            }
        )

        if (!searchJob) {
            return res.status(404).send({ message: "No job found", type: "error" })
        }

        return res.status(200).send(searchJob)
    } catch (e) {
        console.log(e);
        res.status(500).send({ message: "Something went wrong. Please try again later", type: "error" })
    }

}