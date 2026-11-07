import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type OrderKey = "knittingOrder" | "dyeingOrder" | "aopOrder";

interface DeliveryTypeTotal {
    deliveryType: string;
    totalQty: number;
}

interface FactoryStockResponse {
    factoryName: string;
    deliveryTypeWiseTotal: DeliveryTypeTotal[];
}

interface MonthOption {
    key: string; // "2026-09"
    label: string; // "Sep'26"
}

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* The route param equals WorkOrder.orderType in the database.         */
/* ------------------------------------------------------------------ */
const ORDER_DELIVERY_TYPES: Record<OrderKey, string[]> = {
    knittingOrder: ["Yarn Delivery", "Yarn Return", "Grey Fabric Received"],
    dyeingOrder: ["Grey Delivery", "Grey Return", "Grey Received", "Finish Received"],
    aopOrder: ["Sent For Aop", "Return From Aop", "Received From Aop", "AOP Finish Fabric Rcvd"],
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const CACHE_TTL_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const round2 = (v: number) => Math.round(v * 100) / 100;

const isOrderKey = (v: string): v is OrderKey => v in ORDER_DELIVERY_TYPES;

/* "2026-09-15" -> Date (UTC midnight) or null if invalid */
const parseYmd = (s: unknown): Date | null => {
    if (typeof s !== "string" || !DATE_RE.test(s)) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
};

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const monthKeyOf = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const toMonthOption = (key: string): MonthOption => {
    const [y, m] = key.split("-");
    return { key, label: `${MON[Number(m) - 1]}'${y!.slice(2)}` };
};

const monthsFromSet = (set: Set<string>): MonthOption[] =>
    Array.from(set)
        .sort((a, b) => b.localeCompare(a)) // newest first
        .map(toMonthOption);

/* months picker list, cached 5 minutes per order type */
const monthsCache = new Map<OrderKey, { at: number; list: MonthOption[] }>();

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* GET /api/mis-party-stock/:orderType?fromDate&toDate&months          */
/* ------------------------------------------------------------------ */
export const partyWiseStock = async (req: Request, res: Response) => {
    try {
        /* ---------- 1. validate input ---------- */
        const orderType = String(req.params.orderType || "");
        if (!isOrderKey(orderType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid orderType. Use one of: ${Object.keys(ORDER_DELIVERY_TYPES).join(", ")}`,
            });
        }

        const fromRaw = req.query.fromDate;
        const toRaw = req.query.toDate;
        const monthsRaw = req.query.months;

        const fromDate = fromRaw ? parseYmd(fromRaw) : null;
        const toDate = toRaw ? parseYmd(toRaw) : null;

        if (fromRaw && !fromDate) {
            return res.status(400).json({ success: false, message: "fromDate must be YYYY-MM-DD" });
        }
        if (toRaw && !toDate) {
            return res.status(400).json({ success: false, message: "toDate must be YYYY-MM-DD" });
        }
        if (fromDate && toDate && fromDate > toDate) {
            return res.status(400).json({ success: false, message: "fromDate is after toDate" });
        }

        const monthKeys = (typeof monthsRaw === "string" ? monthsRaw.split(",") : [])
            .map((m) => m.trim())
            .filter(Boolean);
        if (monthKeys.some((m) => !MONTH_RE.test(m))) {
            return res.status(400).json({ success: false, message: "months must be YYYY-MM,YYYY-MM" });
        }

        /* ---------- 2. build the DB-side filter ---------- */
        const types = ORDER_DELIVERY_TYPES[orderType];
        const and: any[] = [];

        if (fromDate) and.push({ deliveryDate: { gte: fromDate } });
        if (toDate) and.push({ deliveryDate: { lt: addDays(toDate, 1) } }); // toDate inclusive
        if (monthKeys.length) {
            and.push({
                OR: monthKeys.map((k) => {
                    const [y, m] = k.split("-").map(Number);
                    return {
                        deliveryDate: {
                            gte: new Date(Date.UTC(y!, m! - 1, 1)),
                            lt: new Date(Date.UTC(y!, m, 1)),
                        },
                    };
                }),
            });
        }

        const hasDateFilter = and.length > 0;
        const deliveryWhere: any = { deliveryType: { in: types }, ...(hasDateFilter ? { AND: and } : {}) };

        /* ---------- 3. one lean query: work orders of THIS tab only ---------- */
        const data = await prisma.workOrder.findMany({
            where: {
                orderType, // <-- the missing filter: knittingOrder / dyeingOrder / aopOrder
                compositions: { some: { deliveries: { some: deliveryWhere } } },
            },
            select: {
                factoryName: true,
                compositions: {
                    select: {
                        deliveries: {
                            where: deliveryWhere,
                            select: {
                                deliveryType: true,
                                deliveryQty: true,
                                deliveryDate: true,
                            },
                        },
                    },
                },
            },
        });

        /* ---------- 4. aggregate in O(n) with Maps ---------- */
        const factories = new Map<string, { factoryName: string; totals: Map<string, number> }>();
        const monthSet = new Set<string>();

        for (const wo of data) {
            const factoryName = (wo.factoryName || "").trim() || "Unknown Factory";
            const fKey = factoryName.toLowerCase(); // merges " SHISHIR DYEING" + "SHISHIR DYEING"

            let entry = factories.get(fKey);
            if (!entry) {
                entry = { factoryName, totals: new Map() };
                factories.set(fKey, entry);
            }

            for (const comp of wo.compositions) {
                for (const d of comp.deliveries) {
                    const type = d.deliveryType as unknown as string;
                    const qty = Number(d.deliveryQty) || 0;
                    entry.totals.set(type, (entry.totals.get(type) || 0) + qty);

                    if (d.deliveryDate) monthSet.add(monthKeyOf(new Date(d.deliveryDate)));
                }
            }
        }

        const result: FactoryStockResponse[] = Array.from(factories.values())
            .map((f) => ({
                factoryName: f.factoryName,
                deliveryTypeWiseTotal: Array.from(f.totals, ([deliveryType, totalQty]) => ({
                    deliveryType,
                    totalQty: round2(totalQty),
                })),
            }))
            .sort((a, b) => a.factoryName.localeCompare(b.factoryName));

        /* ---------- 5. months list for the picker ---------- */
        let months: MonthOption[];

        if (!hasDateFilter) {
            // unfiltered pass already saw every delivery -> free
            months = monthsFromSet(monthSet);
            monthsCache.set(orderType, { at: Date.now(), list: months });
        } else {
            // filtered pass only saw part of the data -> need the full list (cached)
            const cached = monthsCache.get(orderType);
            if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
                months = cached.list;
            } else {
                const all = await prisma.workOrder.findMany({
                    where: {
                        orderType,
                        compositions: {
                            some: { deliveries: { some: { deliveryType: { in: types } } } },
                        },
                    },
                    select: {
                        compositions: {
                            select: {
                                deliveries: {
                                    where: { deliveryType: { in: types } },
                                    select: { deliveryDate: true },
                                },
                            },
                        },
                    },
                });
                const set = new Set<string>();
                for (const wo of all) {
                    for (const comp of wo.compositions) {
                        for (const d of comp.deliveries) {
                            if (d.deliveryDate) set.add(monthKeyOf(new Date(d.deliveryDate)));
                        }
                    }
                }
                months = monthsFromSet(set);
                monthsCache.set(orderType, { at: Date.now(), list: months });
            }
        }

        /* ---------- 6. respond ---------- */
        return res.status(200).json({
            success: true,
            count: result.length,
            months,
            data: result,
        });
    } catch (error) {
        console.error("Error in partyWiseStock:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
};