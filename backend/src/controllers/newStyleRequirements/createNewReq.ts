import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { checkDataExist } from "../../utils/checkIfDataExist";

export const createNewStyleRequirement = async (req: Request, res: Response) => {
    const { orderInfo, rows } = req.body;

    if (!orderInfo || !rows) {
        return res.status(400).send({ message: "No data provided", type: "error" })
    }
    // console.log(orderInfo.jobNo, "job no");
    try {

        const checkIfExist = await checkDataExist(orderInfo.jobNo)
        console.log(checkIfExist);
        if(!checkIfExist?.created){
            return res.status(400).send({ message: "Job No already exist", type: "error" })
        }

        await prisma.$transaction(async (tx) => {

            let styleId = null;
            const findStyleName = await tx.styleRequirement.findUnique(
                {
                    where: { styleNo: orderInfo.styleNo }
                },

            )

            styleId = findStyleName ? findStyleName.id : null;

            if (!findStyleName) {
                const createNewStyle = await tx.styleRequirement.create(
                    {
                        data: {
                            styleNo: orderInfo.styleNo as string,
                            buyerName: orderInfo.buyerName as string,
                            jobNo: orderInfo.jobNo as string,
                            processLoss: orderInfo.processLoss as string,
                            poNo: orderInfo.poNo as string,
                            salesContact: orderInfo.salesContact as string,
                        },
                        select: {
                            id: true,
                        }
                    }
                )

                styleId = createNewStyle.id;
            }
            await tx.styleRequirementRow.createMany(
                {
                    data: rows.map((row: any) => ({
                        styleRequirementId: Number(styleId),  // foreign key
                        color: row.color,
                        composition: row.composition,
                        finishDia: row.finishDia,
                        orderQty: Number(row.orderQty),
                        finishRequiredQty: Number(row.finishRequiredQty),
                    }))
                }
            )
        }, {
            timeout: 15000
        })

        res.status(200).send({ message: "Style requirement created successfully", type: "success" })
    } catch (error) {
        console.log(error);
        return res.status(500).send({ message: "Internal server error", type: "error" })
    }
};