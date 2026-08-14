import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";
import { challanValidation } from "../../helpers/challanValidation/challanValidation";
import { getIO } from "../../middleware/socket.io/socket";

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

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) return;
    io.emit(event, payload);
};

export const updateJobs = async (req: Request, res: Response) => {
    const requestStart = process.hrtime.bigint();

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

        const userId = Number(req.user?.userId);
        if (!req.user || Number.isNaN(userId)) {
            return res.status(401).json({ type: "error", message: "Unauthorized" });
        }

        const checkYarnIfExist = await prisma.composition.findUnique({
            where: { id: yarnIdNum },
            select: { id: true },
        });

        if (!checkYarnIfExist) {
            return res.status(404).json({ type: "error", message: "Yarn not found" });
        }

        const delivers = deliveries.filter(
            (d): d is DeliveryItem =>
                d.deliveryType !== undefined && d.qty !== undefined && !Number.isNaN(Number(d.qty)) && Number(d.qty) > 0
        );

        if (delivers.length === 0) {
            return res.status(400).json({ type: "error", message: "No valid delivery entries provided" });
        }

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

        // ── Time only the actual DB write ──
        const dbWriteStart = process.hrtime.bigint();

        const insert = await prisma.$transaction(
            delivers.map((delivery) => {
                // Explicitly typed as the "unchecked" variant so Prisma resolves
                // challanId / yarnCompId / createdBy as raw scalar FK columns,
                // not as nested `connect` relation objects.
                const data: Prisma.deliveriesUncheckedCreateInput = {
                    deliveryDate,
                    challanNo: challanNoNum,
                    challanId,
                    deliveryQty: Number(delivery.qty),
                    deliveryType: delivery.deliveryType,
                    yarnId: checkYarnIfExist.id,
                    fromFactory,
                    toFactory,
                    yarnCompId: checkYarnIfExist.id,
                    createdBy: userId,
                };
                return prisma.deliveries.create({ data });
            })
        );

        const dbWriteEnd = process.hrtime.bigint();
        const dbWriteMs = Number(dbWriteEnd - dbWriteStart) / 1_000_000;

        if (!insert || insert.length !== delivers.length) {
            return res.status(500).json({ type: "error", message: "Failed to create deliveries" });
        }

        try {
            emitProgress("delivery:created", {
                challanId,
                workOrderId,
                yarnId: yarnIdNum,
                count: insert.length,
                deliveries: insert,
                dbWriteMs,
            });
        } catch (socketErr) {
            console.error("emitProgress failed:", socketErr);
        }

        const totalMs = Number(process.hrtime.bigint() - requestStart) / 1_000_000;

        return res.status(200).json({
            type: "success",
            message: "Delivery quantity updated successfully",
            data: insert,
            meta: {
                recordsCreated: insert.length,
                dbWriteMs: Math.round(dbWriteMs * 100) / 100,
                totalMs: Math.round(totalMs * 100) / 100,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};