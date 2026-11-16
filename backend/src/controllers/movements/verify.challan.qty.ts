import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

interface ChallanInput {
    id: number;
    okQty: number;
}

const getDeliveryStatus = (okQty: number, challanQty: number) => {
    if (okQty === challanQty) return "InHouse";
    return okQty > challanQty ? "Excess" : "short";
};

export const verifyChallanQty = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).send({ message: "Unauthorized", type: "error" });
    }

    const challans: ChallanInput[] = req.body?.challans;
    if (!Array.isArray(challans) || challans.length === 0) {
        return res.status(400).send({ message: "Missing required fields", type: "error" });
    }

    const isValid = challans.every(
        (c) => Number.isInteger(Number(c.id)) && Number.isFinite(Number(c.okQty)) && Number(c.okQty) >= 0
    );
    if (!isValid) {
        return res.status(400).send({ message: "Invalid challan data", type: "error" });
    }

    const workingStation = req.user?.workingStation ?? "Unknown";

    try {
        const ids = challans.map((c) => Number(c.id));

        // Replace challanQty with your actual DB column name
        const existing = await prisma.deliveries.findMany({
            where: { id: { in: ids } },
            select: { id: true, challanNo: true, deliveryQty: true },
        });

        if (existing.length !== new Set(ids).size) {
            const found = new Set(existing.map((d) => d.id));
            const missing = ids.filter((id) => !found.has(id));
            return res.status(404).send({
                message: `Challan(s) not found: ${missing.join(", ")}`,
                type: "error",
            });
        }

        const qtyById = new Map(existing.map((d) => [d.id, Number(d.deliveryQty)]));

        await prisma.$transaction(
            challans.map((c) => {
                const okQty = Number(c.okQty);
                return prisma.deliveries.update({
                    where: { id: Number(c.id) },
                    data: {
                        checkedBy: Number(userId),
                        verifiedQty: okQty,
                        workingStation,
                        deliveryStatus: getDeliveryStatus(okQty, qtyById.get(Number(c.id))!),
                    },
                });
            })
        );

        return res.status(200).send({ message: "Challans verified successfully", type: "success" });
    } catch (e) {
        console.error("verifyChallanQty failed:", e);
        return res.status(500).send({ message: "Failed to verify challans", type: "error" });
    }
};