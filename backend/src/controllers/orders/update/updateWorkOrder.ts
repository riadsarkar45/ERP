import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";

export const updateWorkOrder = async (req: Request, res: Response) => {

    const { factoryName, rowId, updatedFieldName, unitePrice, workOrderQty, compId } = req.body as {
        factoryName: string,
        rowId: string,
        updatedFieldName: string,
        unitePrice: number,
        workOrderQty: number,
        compId: string,
    }
    console.log(req.body);
    try {
        if (!req.body) {
            res.status(404).send({ message: "Data not found", type: "error" });
        }

        if (updatedFieldName === "workOrder") {
            const findWorkOrder = await prisma.workOrder.findUnique(
                {
                    where: { id: Number(rowId) },
                    select: { id: true }
                }
            )

            if (!findWorkOrder) {
                res.status(404).send({ message: "Data not found to update", type: "error" })
            }
            await prisma.workOrder.update(
                {
                    where: { id: Number(rowId) },
                    data: {
                        factoryName: factoryName,
                    }
                }
            )
        }
        const updateData: any = {};
        if (unitePrice) {
            updateData.unitePrice = Number(unitePrice);
        }
        if (workOrderQty) {
            updateData.workOrderQty = Number(workOrderQty);
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.composition.update({
                where: { id: Number(compId) },
                data: updateData
            });
        }

        res.status(200).send({ message: "Updated successful", type: "success" })

    } catch (e) {
        console.log(e);
    }
}