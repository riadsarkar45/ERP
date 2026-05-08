import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const updateJobs = async (req: Request, res: Response) => {
    try {
        const { yarnId } = req.params as { yarnId: string };
        const { toFactory, fromFactory, date, challanNo, yarnDelivery, deliveryType } = req.body as { toFactory: string, fromFactory: string, date: string, challanNo: number, yarnDelivery: number, deliveryType: string };

        if (!toFactory || !fromFactory || !date || !challanNo || !yarnDelivery) {
            return res.status(400).json({ type: "error", message: "Missing required fields" });
        }
        const checkYarnIfExist = await prisma.composition.findUnique(
            {
                where: {
                    id: Number(yarnId)
                },
                select: {
                    id: true,
                }
            }
        )

        if (!checkYarnIfExist) {
            return res.status(404).json({ type: "error", message: "Yarn not found" });
        }

        const insertDeliveryQty = await prisma.deliveries.create(
            {
                data: {
                    deliveryDate: new Date(date),
                    challanNo: Number(challanNo),
                    deliveryQty: Number(yarnDelivery), // delivery qty
                    deliveryType: deliveryType, // delivery type
                    yarnId: checkYarnIfExist.id,
                    fromFactory: fromFactory,
                    toFactory: toFactory,
                    yarnCompId: checkYarnIfExist.id
                }
            }
        )

        if (!insertDeliveryQty) {
            return res.status(500).json({ type: "error", message: "Failed to update delivery quantity" });
        }

        return res.status(200).json({ type: "success", message: "Delivery quantity updated successfully" });


    } catch (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};