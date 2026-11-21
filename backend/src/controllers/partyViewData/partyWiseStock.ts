import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type OrderKey = "knittingOrder" | "dyeingOrder" | "aopOrder" | "yarnDyeingOrder";

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
    yarnDyeingOrder: [
        "Yarn Delivery For Yarn Dye",
        "Yarn Return From Yarn Dye",
        "Yarn Received From Yarn Dye",
        "Finish Received",
    ],
};

/* ------------------------------------------------------------------ */
/* FINISH FABRIC (factory wise) - route: /api/mis-party-stock/finishFabric */
/* Finish fabric received INTO our garments factories.                  */
/*  - Dyeing "Finish Received"       (work order type dyeingOrder)      */
/*  - AOP "AOP Finish Fabric Rcvd"   (work order type aopOrder)         */
/* Grouped by the "To" factory of the challan, and only the garments    */
/* factories listed below are kept. Everything else (for example a      */
/* dyeing -> "... AOP" factory challan) is NOT counted as finish.       */
/* ------------------------------------------------------------------ */
const FINISH_KEY = "finishFabric";

const FINISH_SOURCES = [
    { orderType: "dyeingOrder", deliveryType: "Finish Received", label: "Dyeing Finish Received" },
    { orderType: "aopOrder", deliveryType: "AOP Finish Fabric Rcvd", label: "AOP Finish Received" },
] as const;

const FINISH_KEEP_FACTORIES = [
    "sm",
    "sm sourcing",
    "apparel today",
    "apparel",
    "atl",
    "mango",
    "mango tex",
    "actl",
    "advanced",
    "mng",
    
];

/* !!! EDIT THIS ONE LINE !!!
   the column of the delivery row that holds the "To" (garments) factory name of the challan */
const DELIVERY_TO_FACTORY_FIELD = "toFactory";

const normName = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const FINISH_KEEP_SET = new Set(FINISH_KEEP_FACTORIES.map(normName));

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

/* months picker list, cached 5 minutes per tab */
const monthsCache = new Map<string, { at: number; list: MonthOption[] }>();

/* validates fromDate / toDate / months and builds the DB-side date filter */
type Parsed =
    | { ok: false; message: string }
    | { ok: true; and: any[]; hasDateFilter: boolean };

const parseFilters = (req: Request): Parsed => {
    const fromRaw = req.query.fromDate;
    const toRaw = req.query.toDate;
    const monthsRaw = req.query.months;

    const fromDate = fromRaw ? parseYmd(fromRaw) : null;
    const toDate = toRaw ? parseYmd(toRaw) : null;

    if (fromRaw && !fromDate) return { ok: false, message: "fromDate must be YYYY-MM-DD" };
    if (toRaw && !toDate) return { ok: false, message: "toDate must be YYYY-MM-DD" };
    if (fromDate && toDate && fromDate > toDate) return { ok: false, message: "fromDate is after toDate" };

    const monthKeys = (typeof monthsRaw === "string" ? monthsRaw.split(",") : [])
        .map((m) => m.trim())
        .filter(Boolean);
    if (monthKeys.some((m) => !MONTH_RE.test(m))) {
        return { ok: false, message: "months must be YYYY-MM,YYYY-MM" };
    }

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
    return { ok: true, and, hasDateFilter: and.length > 0 };
};

/* months list when a date filter is active (the filtered pass only saw part of the data) */
const loadAllMonths = async (cacheKey: string, orderTypes: string[], types: string[]) => {
    const cached = monthsCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.list;

    const all = await prisma.workOrder.findMany({
        where: {
            orderType: { in: orderTypes },
            compositions: { some: { deliveries: { some: { deliveryType: { in: types } } } } },
        } as any,
        select: {
            compositions: {
                select: {
                    deliveries: {
                        where: { deliveryType: { in: types } } as any,
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
    const list = monthsFromSet(set);
    monthsCache.set(cacheKey, { at: Date.now(), list });
    return list;
};

/* ------------------------------------------------------------------ */
/* FINISH FABRIC controller (factory wise = our garments factory)       */
/* ------------------------------------------------------------------ */
const finishFabricStock = async (req: Request, res: Response) => {
    const parsed = parseFilters(req);
    if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message });
    const { and, hasDateFilter } = parsed;

    const finishTypes: string[] = FINISH_SOURCES.map((s) => s.deliveryType);
    const orderTypes: string[] = FINISH_SOURCES.map((s) => s.orderType);
    const deliveryWhere: any = { deliveryType: { in: finishTypes }, ...(hasDateFilter ? { AND: and } : {}) };

    const data: any[] = await prisma.workOrder.findMany({
        where: {
            orderType: { in: orderTypes },
            compositions: { some: { deliveries: { some: deliveryWhere } } },
        } as any,
        select: {
            orderType: true,
            compositions: {
                select: {
                    deliveries: {
                        where: deliveryWhere,
                        select: {
                            deliveryType: true,
                            deliveryQty: true,
                            deliveryDate: true,
                            [DELIVERY_TO_FACTORY_FIELD]: true,
                        },
                    },
                },
            },
        },
    } as any);

    const factories = new Map<string, { factoryName: string; totals: Map<string, number> }>();
    const monthSet = new Set<string>();

    for (const wo of data) {
        for (const comp of wo.compositions) {
            for (const d of comp.deliveries) {
                /* count a delivery only for its own order type (Yarn Dyeing also has "Finish Received") */
                const src = FINISH_SOURCES.find(
                    (s) => s.orderType === wo.orderType && s.deliveryType === String(d.deliveryType)
                );
                if (!src) continue;

                if (d.deliveryDate) monthSet.add(monthKeyOf(new Date(d.deliveryDate)));

                /* the "To" factory of the challan must be one of our garments factories */
                const toName = String(d[DELIVERY_TO_FACTORY_FIELD] ?? "").trim();
                const fKey = normName(toName);
                if (!FINISH_KEEP_SET.has(fKey)) continue;

                let entry = factories.get(fKey);
                if (!entry) {
                    entry = { factoryName: toName, totals: new Map() };
                    factories.set(fKey, entry);
                }
                entry.totals.set(src.label, (entry.totals.get(src.label) || 0) + (Number(d.deliveryQty) || 0));
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

    let months: MonthOption[];
    if (!hasDateFilter) {
        months = monthsFromSet(monthSet);
        monthsCache.set(FINISH_KEY, { at: Date.now(), list: months });
    } else {
        months = await loadAllMonths(FINISH_KEY, orderTypes, finishTypes);
    }

    return res.status(200).json({ success: true, count: result.length, months, data: result });
};

/* ------------------------------------------------------------------ */
/* Controller                                                          */
/* GET /api/mis-party-stock/:orderType?fromDate&toDate&months          */
/* ------------------------------------------------------------------ */
export const partyWiseStock = async (req: Request, res: Response) => {
    try {
        /* ---------- 1. validate input ---------- */
        const orderType = String(req.params.orderType || "");

        if (orderType === FINISH_KEY) return await finishFabricStock(req, res);

        if (!isOrderKey(orderType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid orderType. Use one of: ${[...Object.keys(ORDER_DELIVERY_TYPES), FINISH_KEY].join(", ")}`,
            });
        }

        const parsed = parseFilters(req);
        if (!parsed.ok) return res.status(400).json({ success: false, message: parsed.message });
        const { and, hasDateFilter } = parsed;

        /* ---------- 2. DB-side filter ---------- */
        const types = ORDER_DELIVERY_TYPES[orderType];
        const deliveryWhere: any = { deliveryType: { in: types }, ...(hasDateFilter ? { AND: and } : {}) };

        /* ---------- 3. one lean query: work orders of THIS tab only ---------- */
        const data = await prisma.workOrder.findMany({
            where: {
                orderType, // knittingOrder / dyeingOrder / aopOrder / yarnDyeingOrder
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
            months = monthsFromSet(monthSet);
            monthsCache.set(orderType, { at: Date.now(), list: months });
        } else {
            months = await loadAllMonths(orderType, [orderType], types);
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