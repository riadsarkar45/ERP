import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";
export const updateStyleReq = async (req: Request, res: Response) => {
    const { salesContact, buyerName, styleNo, poNo, jobNo } = req.body as
        { salesContact: string, buyerName: string, styleNo: string, poNo: string, jobNo: string }

    const { jobId } = req.params as { jobId: string };
    const jobIdToNumber = Number(jobId)

    console.log(req.body, "body data");
    console.log(req.params.jobId, "param data");

    const checkIfDataExist = await prisma.styleRequirement.findUnique({
        where: { id: jobIdToNumber },
        select: {
            id: true,
        }
    })

    if (!checkIfDataExist) {
        return res.send({ message: "Requested data not updated", type: "error" });
    }

    const update = await prisma.styleRequirement.update(
        {
            where: { id: jobIdToNumber },
            data: {
                salesContact: salesContact,
                buyerName: buyerName,
                styleNo: styleNo,
                jobNo: jobNo,
                poNo: poNo,
            }
        }
    )

    if (jobNo) {
        await prisma.jobs.update({
            where: { jobNo: jobNo },
            data: {
                jobNo: jobNo
            }
        })
    }

    if (!update) {
        return res.send({ message: "Update Failed", type: "error" })
    }

    return res.send({ message: "Update Successful", type: "success" })

}