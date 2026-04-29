import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
export const createNewJob = async (req: Request, res: Response) => {
    // res.send({ message: "request received" })
    const {
        compositions,

    } = req.body as {
        compositions: { composition: string; color: string; workOrderQty: string, orderQty: string }[];

    };
    console.log(compositions);
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
                    compositions: {
                        createMany: {
                            data: compositions.map(({ composition, color, orderQty, workOrderQty }) => ({
                                composition,
                                color,
                                orderQty: Number(orderQty),
                                workOrderQty: Number(workOrderQty),
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