import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

/* single source of truth: delivery types per order type */
const DELIVERY_TYPES: Record<string, string[]> = {
    knittingOrder: ["Yarn Delivery", "Yarn Return", "Grey Fabric Received"],
    dyeingOrder: [
        "Grey Received", "Grey Delivery", "Grey Return",
        "Sent For Compacting", "Received From Compacting",
        "Sent For Reprocess", "Received From Reprocess",
    ],
    aopOrder: ["Sent For Aop", "Return From Aop", "Received From Aop"],
    yarnDyeingOrder: [
        "Yarn Delivery For Yarn Dye", "Yarn Return From Yarn Dye",
        "Yarn Received From Yarn Dye", "Finish Received", "Finish Return",
    ],
};

const ORDER_TYPE_BY_DELIVERY_TYPE: Record<string, string> = Object.fromEntries(
    Object.entries(DELIVERY_TYPES).flatMap(([orderType, types]) =>
        types.map((t): [string, string] => [t, orderType])
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
        // ?date=YYYY-MM-DD — defaults to *today* in Bangladesh time (UTC+6)
        const day: string =
            (req.query.date as string | undefined) ??
            new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

        // BST day window: 00:00 Dhaka → 00:00 Dhaka next day
        const start = new Date(`${day}T00:00:00+06:00`);
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

        const grouped = await prisma.deliveries.groupBy({
            by: ["deliveryType"],
            where: {
                deliveryDate: { gte: start, lt: end },
                // ✅ fix #1: removed `deliveryType: { not: null }`
                // (column is a required String → can never be null)
            },
            _sum: { deliveryQty: true },
            _count: { id: true },
        });

        const data: DeliverySummaryRow[] = grouped.map((g) => {
            // required String column → already typed `string`
            const deliveryType: string = g.deliveryType;

            // ✅ fix #2: aggregates are optional in Prisma's types → safe access
            const quantity = Number(g._sum?.deliveryQty ?? 0);

            // ✅ fix #3: _count is `true | { id?: number } | undefined` → narrow it
            const count = g._count;
            const entries =
                typeof count === "object" && count !== null ? (count.id ?? 0) : 0;

            return {
                orderType: ORDER_TYPE_BY_DELIVERY_TYPE[deliveryType] ?? "other",
                deliveryType,
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
            data,
        });
    } catch (error) {
        console.error("dailyDeliveryMovement error:", error);
        return res
            .status(500)
            .send({ success: false, msg: "Failed to load deliveries", type: "error" });
    }
};