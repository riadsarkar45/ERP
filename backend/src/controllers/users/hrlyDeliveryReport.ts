import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const DELIVERY_TYPES: Record<string, string[]> = {
    knittingOrder: ["Yarn Delivery", "Yarn Return", "Grey Fabric Received"],
    dyeingOrder: [
        "Grey Received", "Grey Delivery", "Grey Return",
        "Sent For Compacting", "Received From Compacting",
        "Sent For Reprocess", "Received From Reprocess",
        "Finish Received", "Finish Return",
    ],
    aopOrder: [
        "Sent For Aop", "Return From Aop", "Received From Aop", "AOP Finish Fabric Rcvd",
    ],
    yarnDyeingOrder: [
        "Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye",
        "Yarn Received From Yarn Dye",
    ],
};

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

const ORDER_TYPE_BY_DELIVERY_TYPE_LC: Record<string, string> = Object.fromEntries(
    Object.entries(DELIVERY_TYPES).flatMap(([orderType, types]) =>
        types.map((t): [string, string] => [normalize(t), orderType])
    )
);

interface DeliverySummaryRow {
    orderType: string;
    deliveryType: string;
    quantity: number;
    entries: number;
}

export const hourlyDeliveryMovement = async (
    req: Request,
    res: Response
): Promise<Response> => {
    try {
        const day: string =
            (req.query.date as string | undefined) ??
            new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

        const start = new Date(`${day}T00:00:00+06:00`);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const range = { gte: start, lt: end };

        const useDeliveryDate = req.query.by === "deliveryDate";

        const grouped = await prisma.deliveries.groupBy({
            by: ["deliveryType"],
            where: useDeliveryDate ? { deliveryDate: range } : { createdAt: range },
            _sum: { deliveryQty: true },
            _count: { id: true },
        });

        const data: DeliverySummaryRow[] = grouped.map((g) => {
            const rawType: string = g.deliveryType;
            const quantity = Number(g._sum?.deliveryQty ?? 0);
            const count = g._count;
            const entries =
                typeof count === "object" && count !== null ? (count.id ?? 0) : 0;

            return {
                orderType: ORDER_TYPE_BY_DELIVERY_TYPE_LC[normalize(rawType)] ?? "other",
                deliveryType: rawType,
                quantity,
                entries,
            };
        });

        return res.status(200).send({
            success: true,
            msg: "Deliveries found",
            type: "success",
            date: day,
            granularity: "daily",
            groupedBy: useDeliveryDate ? "deliveryDate" : "createdAt",
            data,
        });
    } catch (error) {
        console.error("hourlyDeliveryMovement error:", error);
        return res
            .status(500)
            .send({ success: false, msg: "Failed to load deliveries", type: "error" });
    }
};