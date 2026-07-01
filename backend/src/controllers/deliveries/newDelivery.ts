import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { challanValidation } from "../../helpers/challanValidation/challanValidation";

interface DeliveryItem {
    deliveryType: string;
    qty: number;
}

interface UpdateJobsBody {
    toFactory: string;
    fromFactory: string;
    date: string;
    challanNo: number;
    deliveries: DeliveryItem[];
    deliveryQty?: number;
    deliveryType?: string;
}

export const updateJobs = async (req: Request, res: Response) => {
    try {
        const { yarnId, workOrderId } = req.query as { yarnId: string, workOrderId: string };
        const { toFactory, fromFactory, date, challanNo, deliveries } = req.body as UpdateJobsBody;
        if (!toFactory || !fromFactory || !date || !challanNo || !deliveries?.length) {
            return res.status(400).json({ type: "error", message: "Missing required fields" });
        }

        const checkYarnIfExist = await prisma.composition.findUnique({
            where: { id: Number(yarnId) },
            select: { id: true }
        });

        if (!checkYarnIfExist) {
            return res.status(404).json({ type: "error", message: "Yarn not found" });
        }

        const delivers = req.body.deliveries.filter(
            (d: any) => d.deliveryType !== undefined && d.qty !== undefined
        );

        // 🔥 CHANGED: now pass yarnId so the duplicate-challan check is scoped
        // per composition instead of globally by challanNo + toFactory.
        const verifyChallan = await challanValidation(
            challanNo,
            workOrderId,
            toFactory,
            checkYarnIfExist.id
        );

        if (!verifyChallan.success) {
            return res.status(409).json({
                deliveries: verifyChallan,
            });
        }

        if (delivers.length > 0) {
            await prisma.$transaction(
                delivers.map((delivery: any) =>
                    prisma.deliveries.create({
                        data: {
                            deliveryDate: new Date(date),
                            challanNo: Number(challanNo),
                            deliveryQty: Number(delivery.qty),
                            deliveryType: delivery.deliveryType,
                            yarnId: checkYarnIfExist.id,
                            fromFactory,
                            toFactory,
                            yarnCompId: checkYarnIfExist.id,
                        }
                    })
                )
            );
        } else {
            await prisma.deliveries.create({
                data: {
                    deliveryDate: new Date(date),
                    challanNo: Number(challanNo),
                    deliveryQty: Number(req.body.deliveryQty),
                    deliveryType: req.body.deliveryType,
                    toFactory: req.body.toFactory,
                    fromFactory: req.body.fromFactory,
                    yarnId: Number(checkYarnIfExist.id),
                    yarnCompId: Number(checkYarnIfExist.id),
                }
            });
        }

        return res.status(200).json({ type: "success", message: "Delivery quantity updated successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};