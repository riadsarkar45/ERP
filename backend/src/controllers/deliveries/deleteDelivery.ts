import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const deleteChallanFromDelivery = async (req: Request, res: Response) => {
    const { deliveryId } = req.params;
    if (!deliveryId) {
        return res.status(404).send({ message: "No data found", type: "error" })
    }

    const checkIfDeliveryExist = await prisma.deliveries.findUnique(
        {
            where: { id: Number(deliveryId) },
            select: {
                id: true,
            }
        }
    )

    if (!checkIfDeliveryExist) {
        return res.status(404).send({ message: "No records found", type: "error" })
    }

    const deleteDeliveryRecord = await prisma.deliveries.delete(
        {
            where: { id: Number(checkIfDeliveryExist.id) },
            select: {
                challanNo: true,
                deliveryQty: true,
                deliveryType: true,
            }
        }
    )

    if (!deleteDeliveryRecord) {
        return res.send({ message: "Delete Failed", type: "error" })
    }

    return res.status(200).send({ message: "Delete Successful", deletedRecord: deleteDeliveryRecord, type: "success" })

}