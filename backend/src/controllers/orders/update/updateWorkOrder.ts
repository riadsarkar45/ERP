import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";

export const updateWorkOrder = async (req: Request, res: Response) => {
    const { factoryName, rowId, updatedFieldName, unitePrice, workOrderQty, compId } = req.body as {
        factoryName?: string,
        rowId: string,
        updatedFieldName: string,
        unitePrice?: number,
        workOrderQty?: number,
        compId?: string,
    }
    console.log(req.body, "body data");

    try {
        if (!req.body || !rowId || !updatedFieldName) {
            return res.status(400).send({ message: "Data not found", type: "error" });
        }

        // Fields that live on WorkOrder
        if (updatedFieldName === "factoryName") {
            if (factoryName === undefined) {
                return res.status(400).send({ message: "factoryName is required", type: "error" });
            }

            const findWorkOrder = await prisma.workOrder.findUnique({
                where: { id: Number(rowId) },
                select: { id: true }
            });

            if (!findWorkOrder) {
                return res.status(404).send({ message: "Data not found to update", type: "error" });
            }

            await prisma.workOrder.update({
                where: { id: Number(rowId) },
                data: { factoryName }
            });
        }

        // Fields that live on Composition
        const updateData: Record<string, number> = {};
        if (unitePrice !== undefined) updateData.unitePrice = Number(unitePrice);
        if (workOrderQty !== undefined) updateData.workOrderQty = Number(workOrderQty);

        if (Object.keys(updateData).length > 0 && compId !== undefined) {
            await prisma.composition.update({
                where: { id: Number(compId) },
                data: updateData
            });
        }

        return res.status(200).send({ message: "Updated successful", type: "success" });

    } catch (e) {
        console.log(e);
        return res.status(500).send({ message: "Update failed", type: "error" });
    }
}