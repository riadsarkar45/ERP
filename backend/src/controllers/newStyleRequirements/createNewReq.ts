import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { checkDataExist } from "../../utils/checkIfDataExist";

export const createNewStyleRequirement = async (req: Request, res: Response) => {
    const { orderInfo, rows } = req.body;

    if (!orderInfo || !rows) {
        return res.status(400).send({ message: "No data provided", type: "error" })
    }

    try {

        const checkIfExist = await checkDataExist(orderInfo.jobNo)
        console.log(checkIfExist);
        if (!checkIfExist?.created) {
            return res.status(400).send({ message: "Job No already exist", type: "error" })
        }

        await prisma.$transaction(async (tx) => {

            // Always create a new styleRequirement, even if styleNo already exists
            const createNewStyle = await tx.styleRequirement.create({
                data: {
                    styleNo: orderInfo.styleNo as string,
                    buyerName: orderInfo.buyerName as string,
                    jobNo: orderInfo.jobNo as string,
                    processLoss: Number(orderInfo.processLoss) as number,
                    poNo: orderInfo.poNo as string,
                    salesContact: orderInfo.salesContact as string,
                },
                select: {
                    id: true,
                }
            })

            const styleId = createNewStyle.id;

            await tx.styleRequirementRow.createMany({
                data: rows.map((row: any) => ({
                    styleRequirementId: Number(styleId), // foreign key
                    color: row.color,
                    composition: row.composition,
                    finishDia: row.finishDia,
                    orderQty: Number(row.orderQty),
                    finishRequiredQty: Number(row.finishRequiredQty),
                }))
            })

        }, {
            timeout: 15000
        })

        res.status(200).send({ message: "Style requirement created successfully", type: "success" })
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Internal server error", type: "error" })
    }
};