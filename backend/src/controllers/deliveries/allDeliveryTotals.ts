import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

// Bangladesh = UTC+6. Used ONLY for timestamp columns (deliveryDate).
// Date-only columns (newWorkOrderPlaceDate) use plain UTC midnight (offset 0).
const TZ_OFFSET_HOURS = 6;

const TZ_OFFSET_MS = TZ_OFFSET_HOURS * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type DateRange = { gte?: Date; lt?: Date };

// work in hundredths (2 decimal precision) to avoid float drift
const toInt = (n: unknown) => Math.round(Number(n ?? 0) * 100);
const fromInt = (n: number) => n / 100;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// "YYYY-MM-DD" -> start of that day shifted by offsetMs, or null if invalid
const parseDayStart = (s: string, offsetMs: number): Date | null => {
    if (!DATE_RE.test(s)) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    return new Date(d.getTime() - offsetMs);
};

/**
 * month takes priority over fromDate/toDate.
 * offsetMs = TZ_OFFSET_MS for timestamp columns, 0 for date-only columns.
 * Returns { range: undefined } when no filter is supplied.
 */
const buildDateRange = (
    q: Request["query"],
    offsetMs: number
): { range?: DateRange; error?: string } => {
    const month = str(q.month);
    const fromDate = str(q.fromDate);
    const toDate = str(q.toDate);

    if (month) {
        if (!MONTH_RE.test(month)) return { error: "Invalid month. Use YYYY-MM" };
        const y = Number(month.slice(0, 4));
        const m = Number(month.slice(5, 7));
        return {
            range: {
                gte: new Date(Date.UTC(y, m - 1, 1) - offsetMs),
                lt: new Date(Date.UTC(y, m, 1) - offsetMs),
            },
        };
    }

    if (!fromDate && !toDate) return {};

    const range: DateRange = {};

    if (fromDate) {
        const from = parseDayStart(fromDate, offsetMs);
        if (!from) return { error: "Invalid fromDate. Use YYYY-MM-DD" };
        range.gte = from;
    }

    if (toDate) {
        const to = parseDayStart(toDate, offsetMs);
        if (!to) return { error: "Invalid toDate. Use YYYY-MM-DD" };
        range.lt = new Date(to.getTime() + DAY_MS); // include the whole "to" day
    }

    if (range.gte && range.lt && range.gte >= range.lt) {
        return { error: "fromDate cannot be after toDate" };
    }

    return { range };
};

export const getDeliveryTotals = async (req: Request, res: Response) => {
    try {
        const orderType = str(req.params.orderType);
        if (!orderType) {
            return res.status(400).send({ message: "orderType is required", type: "error" });
        }

        // timestamp range (deliveryDate): Bangladesh local days
        const { range: deliveryRange, error } = buildDateRange(req.query, TZ_OFFSET_MS);
        if (error) {
            return res.status(400).send({ message: error, type: "error" });
        }

        // date-only range (newWorkOrderPlaceDate): plain UTC days, no shift
        const { range: placeDateRange } = buildDateRange(req.query, 0);

        const [workOrderAgg, deliveryGroups] = await Promise.all([
            // Work order qty: filtered by the parent WorkOrder.newWorkOrderPlaceDate
            prisma.composition.aggregate({
                where: {
                    orderType,
                    ...(placeDateRange
                        ? { workOrder: { newWorkOrderPlaceDate: placeDateRange } }
                        : {}),
                },
                _sum: { workOrderQty: true },
            }),

            // Delivery qty: filtered by deliveries.deliveryDate, grouped by type
            prisma.deliveries.groupBy({
                by: ["deliveryType"],
                where: {
                    composition: { orderType },
                    ...(deliveryRange ? { deliveryDate: deliveryRange } : {}),
                },
                _sum: { deliveryQty: true },
            }),
        ]);

        // normalise delivery type keys (strip whitespace) and merge duplicates
        const deliverySums: Record<string, number> = {};
        for (const g of deliveryGroups) {
            const key = String(g.deliveryType).replace(/\s+/g, "");
            deliverySums[key] = (deliverySums[key] || 0) + toInt(g._sum.deliveryQty);
        }

        const merged: Record<string, { workOrderQty: number; deliveryQty: number }> = {};

        // work order total lives under the orderType key (e.g. "knittingOrder")
        merged[orderType] = {
            workOrderQty: fromInt(toInt(workOrderAgg._sum.workOrderQty)),
            deliveryQty: 0,
        };

        // each delivery type gets its own key (e.g. "YarnDelivery")
        for (const [type, qty] of Object.entries(deliverySums)) {
            merged[type] = {
                workOrderQty: 0,
                deliveryQty: fromInt(qty),
            };
        }

        // always 200: the frontend shows zeros when nothing matches
        return res.send(merged);
    } catch (err) {
        console.error("getDeliveryTotals failed:", err);
        return res.status(500).send({ message: "Failed to load summary", type: "error" });
    }
};