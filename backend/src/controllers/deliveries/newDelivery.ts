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
}

export const updateJobs = async (req: Request, res: Response) => {
    try {
        const { yarnId, workOrderId } = req.query as { yarnId: string; workOrderId: string };
        const { toFactory, fromFactory, date, challanNo, deliveries } = req.body as UpdateJobsBody;

        if (!toFactory || !fromFactory || !date || !challanNo || !deliveries?.length) {
            return res.status(400).json({ type: "error", message: "Missing required fields" });
        }

        const yarnIdNum = Number(yarnId);
        if (!yarnId || Number.isNaN(yarnIdNum)) {
            return res.status(400).json({ type: "error", message: "Invalid or missing yarnId" });
        }

        if (!workOrderId) {
            return res.status(400).json({ type: "error", message: "Missing workOrderId" });
        }

        const challanNoNum = Number(challanNo);
        if (Number.isNaN(challanNoNum)) {
            return res.status(400).json({ type: "error", message: "Invalid challanNo" });
        }

        const deliveryDate = new Date(date);
        if (Number.isNaN(deliveryDate.getTime())) {
            return res.status(400).json({ type: "error", message: "Invalid date" });
        }

        // Composition must exist. (Don't require a Challan yet — it may not exist on first delivery.)
        const checkYarnIfExist = await prisma.composition.findUnique({
            where: { id: yarnIdNum },
            select: { id: true },
        });

        if (!checkYarnIfExist) {
            return res.status(404).json({ type: "error", message: "Yarn not found" });
        }

        // Find the Challan by its compound unique key; create it if it doesn't exist yet.
        let challan = await prisma.challan.findUnique({
            where: {
                challanNo_toFactory_fromFactory: {
                    challanNo: challanNoNum,
                    toFactory,
                    fromFactory,
                },
            },
            select: { id: true },
        });

        if (!challan) {
            challan = await prisma.challan.create({
                data: {
                    challanNo: challanNoNum,
                    challanDate: deliveryDate,
                    toFactory,
                    fromFactory,
                },
                select: { id: true },
            });
        }

        const delivers = deliveries.filter(
            (d): d is DeliveryItem =>
                d.deliveryType !== undefined && d.qty !== undefined && !Number.isNaN(Number(d.qty))
        );

        if (delivers.length === 0) {
            return res.status(400).json({ type: "error", message: "No valid delivery entries provided" });
        }

        const validations = await Promise.all(
            delivers.map(async (delivery) => {
                const result = await challanValidation(
                    challanNoNum,
                    workOrderId,
                    toFactory,
                    fromFactory,
                    checkYarnIfExist.id,
                    delivery.deliveryType
                );
                return { result, deliveryType: delivery.deliveryType };
            })
        );

        const failures = validations.filter((v) => !v.result.success);

        if (failures.length > 0) {
            return res.status(409).json({
                type: "error",
                message: "One or more delivery validations failed",
                deliveries: failures.map((f) => ({
                    deliveryType: f.deliveryType,
                    ...f.result,
                })),
            });
        }

        const challanId = challan.id;

        await prisma.$transaction(
            delivers.map((delivery) =>
                prisma.deliveries.create({
                    data: {
                        deliveryDate,
                        challanNo: challanNoNum,
                        challanId,
                        deliveryQty: Number(delivery.qty),
                        deliveryType: delivery.deliveryType,
                        yarnId: checkYarnIfExist.id,
                        fromFactory,
                        toFactory,
                        yarnCompId: checkYarnIfExist.id,
                    },
                })
            )
        );

        return res.status(200).json({ type: "success", message: "Delivery quantity updated successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};