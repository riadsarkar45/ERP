import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
export const createNewJob = async (req: Request, res: Response) => {
    // res.send({ message: "request received" })
    const {
        compositions,
        orderType
    } = req.body as {
        compositions: { composition: string; color: string; workOrderQty: string, orderQty: string, unitPrice: string, }[];
        orderType: string;
    };

    const findStyleNo = await prisma.styleRequirement.findUnique(
        {
            where: { styleNo: req.body.styleNo }
        },
    )

    if(!findStyleNo){
        return res.status(400).send({ message: "Style No not found", type: "error" })
    }

    console.log(findStyleNo);

    console.log(req.body);
    try {
        const workOrder = await prisma.workOrder.create(
            {
                data: {
                    workOrderPlaceDate: req.body.workOrderPlaceDate,
                    workOrderNo: req.body.workOrderNo,
                    month: req.body.month,
                    styleNo: req.body.styleNo,
                    lotNo: req.body.lotNo,
                    orderType: orderType,
                    styleRequirementId: findStyleNo.id,
                    compositions: {
                        createMany: {
                            data: compositions.map(({ composition, color, orderQty, workOrderQty, unitPrice }) => ({
                                composition,
                                color,
                                orderQty: Number(orderQty),
                                workOrderQty: Number(workOrderQty),
                                unitePrice: unitPrice,

                            }))
                        }
                    }
                }
            }
        )
        if (!workOrder) {
            return res.status(500).send({ message: "Failed to save data", type: "error" })
        }
        return res.status(201).send({ message: "Data saved", type: "success" })
    } catch (e) {
        console.log(e);
    }

}