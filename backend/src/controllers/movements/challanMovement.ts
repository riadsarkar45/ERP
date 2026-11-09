import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

// ----- Limits -----
const MAX_PAGE_SIZE = 100;
const LEGACY_TAKE = 100;     // old behaviour, used only when the caller sends no ?limit
const OPTION_LIMIT = 50;     // max distinct values returned for a column filter dropdown
const MAX_FILTER_VALUES = 200;

// Columns the table can filter on the server
const FILTER_KEYS = ["challanNo", "jobNo", "composition", "color", "fromFactory", "toFactory"] as const;
type FilterKey = typeof FILTER_KEYS[number];

// Delivery types that belong to each order type / "others" type (same rules as before)
const getDeliveryTypes = (orderType: string, noOrderType?: string): string[] => {
    const deliveryTypes: string[] = [];
    if (noOrderType === "compacting") {
        deliveryTypes.push("Received From Compacting");
    } else if (noOrderType === "reprocess") {
        deliveryTypes.push("Received From Reprocess");
    } else if (noOrderType === "heat-set") {
        deliveryTypes.push("Received From HEAT Set");
    } else if (noOrderType === "trumble") {
        deliveryTypes.push("Received From Trumble");
    } else if (orderType === "knittingOrder") {
        deliveryTypes.push("Yarn Delivery", "Yarn Return", "Grey Received", "Grey Fabric Received", "Finish Received");
    } else if (orderType === "dyeingOrder") {
        deliveryTypes.push("Grey Delivery", "Grey Return", "Grey Received", "Finish Received");
    } else if (orderType === "aopOrder") {
        deliveryTypes.push("Sent For Aop", "Received From Aop", "AOP Finish Fabric Rcvd", "Return From Aop");
    }
    return deliveryTypes;
};

// ?filters={"jobNo":["A1"],"toFactory":["X"]}  ->  whitelisted, size-limited object
const parseFilters = (raw?: string): Partial<Record<FilterKey, string[]>> => {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        const out: Partial<Record<FilterKey, string[]>> = {};
        FILTER_KEYS.forEach((key) => {
            const value = parsed?.[key];
            if (Array.isArray(value) && value.length > 0) {
                out[key] = value
                    .map((v: unknown) => String(v).slice(0, 200))
                    .slice(0, MAX_FILTER_VALUES);
            }
        });
        return out;
    } catch {
        return {};
    }
};

// ?challanMonths=2026-09,2026-08  ->  [{ gte, lt }] date ranges (UTC)
const parseMonthRanges = (raw?: string) => {
    if (!raw) return [];
    return raw
        .split(",")
        .map((m) => m.trim())
        .filter((m) => /^\d{4}-\d{2}$/.test(m))
        .slice(0, 60)
        .map((m) => {
            const [y, mo] = m.split("-").map(Number);
            return {
                gte: new Date(Date.UTC(y!, mo! - 1, 1)),
                lt: new Date(Date.UTC(y!, mo, 1)),
            };
        });
};

export const challanMovement = async (req: Request, res: Response) => {
    const { orderType, noOrderType } = req.params as { orderType: string, noOrderType: string };
    const { limit: limitRaw, cursor: cursorRaw, filters: filtersRaw, challanMonths } = req.query as {
        limit?: string;
        cursor?: string;
        filters?: string;
        challanMonths?: string;
    };

    if (!orderType) {
        return res.status(400).send({ msg: "No order type found", type: "error" });
    }

    // Callers that do not send ?limit (other pages using this endpoint) keep the old behaviour.
    const paged = limitRaw !== undefined;
    const limit = Math.min(Math.max(parseInt(limitRaw ?? "", 10) || 25, 1), MAX_PAGE_SIZE);

    // Composition id can be Int or String in your schema.
    // Numeric-looking cursors are converted to Number; adjust if your id is a numeric string.
    const cursorId = cursorRaw ? (/^\d+$/.test(cursorRaw) ? Number(cursorRaw) : cursorRaw) : null;


    // Others/no-order-type movements (compacting, reprocess, heat-set,
    // trumble) aren't tied to a priced work order, so unitePrice is
    // treated as optional/not fetched for these — see isOthersType below.
    const isOthersType = ["compacting", "reprocess", "heat-set", "trumble"].includes(noOrderType);
    const deliveryTypes = getDeliveryTypes(orderType, noOrderType);

    // ----- server-side filters (nothing is filtered in the browser any more) -----
    const filters = parseFilters(filtersRaw);
    const monthRanges = parseMonthRanges(challanMonths);

    const deliveryWhere: any = { deliveryType: { in: deliveryTypes } };
    if (filters.toFactory) deliveryWhere.toFactory = { in: filters.toFactory };
    if (filters.fromFactory) deliveryWhere.fromFactory = { in: filters.fromFactory };
    if (filters.challanNo) {
        const nums = filters.challanNo.map(Number).filter((n) => Number.isFinite(n));
        deliveryWhere.challanNo = { in: nums.length > 0 ? nums : [-1] };
    }
    if (monthRanges.length > 0) {
        deliveryWhere.OR = monthRanges.map((range) => ({ deliveryDate: range }));
    }

    const where: any = {
        orderType: orderType,
        deliveries: { some: deliveryWhere },
    };
    if (filters.jobNo) where.workOrder = { jobNo: { in: filters.jobNo } };
    if (filters.composition) where.composition = { in: filters.composition };
    if (filters.color) where.color = { in: filters.color };

    try {
        const compositions = await prisma.composition.findMany({
            where,
            // Stable, unique ordering is REQUIRED for cursor paging (newest first).
            orderBy: { id: "desc" },
            ...(paged
                ? {
                    // one extra row tells us whether another page exists
                    take: limit + 1,
                    ...(cursorId !== null && { cursor: { id: cursorId as any }, skip: 1 }),
                }
                : { take: LEGACY_TAKE }),
            select: {
                composition: true,
                ...(!isOthersType && { unitePrice: true }),
                id: true,
                workOrderQty: true,
                color: true,
                workOrder: {
                    select: {
                        jobNo: true,
                        factoryName: true,
                    }
                },
                deliveries: {
                    // the same filters apply to the nested deliveries, so only matching rows are sent
                    where: deliveryWhere,
                    orderBy: { createdAt: "desc" },
                    select: {
                        deliveryQty: true,
                        deliveryDate: true,
                        deliveryType: true,
                        id: true,
                        challanNo: true,
                        toFactory: true,
                        fromFactory: true,
                    }
                }
            },
        });

        const hasMore = paged && compositions.length > limit;
        const data = hasMore ? compositions.slice(0, limit) : compositions;
        const nextCursor = hasMore ? data[data.length - 1]!.id : null;

        return res.status(200).send({
            msg: "Deliveries found",
            type: "success",
            data,
            nextCursor,
            hasMore,
        });
    } catch (err) {
        console.error("challanMovement failed:", err);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }
};

// GET /challan-filter-options/:orderType?field=toFactory&q=sal
// Returns up to OPTION_LIMIT distinct values for one column (used by the column filter dropdowns),
// so the browser never needs the whole data set to build a filter list.
export const challanFilterOptions = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };
    const { field, q, noOrderType } = req.query as { field?: string; q?: string; noOrderType?: string };

    if (!orderType || !field || !(FILTER_KEYS as readonly string[]).includes(field)) {
        return res.status(400).send({ msg: "Invalid filter field", type: "error" });
    }

    const key = field as FilterKey;
    const term = (q ?? "").trim().slice(0, 100);
    const deliveryTypes = getDeliveryTypes(orderType, noOrderType);
    const hasDeliveries = { some: { deliveryType: { in: deliveryTypes } } };

    try {
        let values: unknown[] = [];

        if (key === "jobNo") {
            const rows: any[] = await prisma.composition.findMany({
                where: {
                    orderType,
                    deliveries: hasDeliveries,
                    ...(term && { workOrder: { jobNo: { contains: term } } }),
                } as any,
                orderBy: { id: "desc" },
                take: 400,
                select: { workOrder: { select: { jobNo: true } } },
            });
            values = rows.map((r) => r.workOrder?.jobNo);
        } else if (key === "composition" || key === "color") {
            const rows: any[] = await prisma.composition.findMany({
                where: {
                    orderType,
                    deliveries: hasDeliveries,
                    ...(term && { [key]: { contains: term } }),
                } as any,
                distinct: [key] as any,
                orderBy: { [key]: "asc" } as any,
                take: OPTION_LIMIT,
                select: { [key]: true } as any,
            });
            values = rows.map((r) => r[key]);
        } else if (key === "challanNo") {
            // Int column: no partial matching, a typed number is matched exactly
            const numeric = term !== "" && Number.isFinite(Number(term));
            const rows: any[] = await prisma.deliveries.findMany({
                where: {
                    deliveryType: { in: deliveryTypes },
                    ...(numeric && { challanNo: Number(term) }),
                } as any,
                distinct: ["challanNo"] as any,
                orderBy: { challanNo: "desc" },
                take: OPTION_LIMIT,
                select: { challanNo: true },
            });
            values = rows.map((r) => r.challanNo);
        } else {
            // fromFactory / toFactory
            const rows: any[] = await prisma.deliveries.findMany({
                where: {
                    deliveryType: { in: deliveryTypes },
                    ...(term && { [key]: { contains: term } }),
                } as any,
                distinct: [key] as any,
                orderBy: { [key]: "asc" } as any,
                take: OPTION_LIMIT,
                select: { [key]: true } as any,
            });
            values = rows.map((r) => r[key]);
        }

        const unique = [...new Set(values.filter((v) => v !== null && v !== undefined && v !== "").map(String))]
            .slice(0, OPTION_LIMIT);

        return res.status(200).send({ type: "success", data: unique });
    } catch (err) {
        console.error("challanFilterOptions failed:", err);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }
};

export const challanMovementByChallanNo = async (req: Request, res: Response) => {
    const { challanNo, deliveryType, orderType, jobNo } = req.params as { challanNo: string, jobNo: string, deliveryType: string, orderType: string };

    if (!challanNo || !orderType) {
        return res.status(400).send({ msg: "Missing required parameters", type: "error" });
    }

    try {

        const findComps = await prisma.composition.findMany(
            {
                where: {
                    orderType: orderType, workOrder: {
                        jobNo: jobNo,
                    }
                },
                select: {
                    composition: true,

                    deliveries: {
                        where: { challanNo: Number(challanNo) },
                        orderBy: { id: "desc" },
                        select: {
                            id: true,
                            deliveryQty: true,
                            deliveryType: true,
                            challanNo: true,
                            createdAt: true,
                            deliveryDate: true,
                            deliveryMonth: true,
                            toFactory: true,
                            fromFactory: true,
                        }
                    }
                }
            }
        )

        if (!findComps || findComps.length === 0) {
            return res.status(404).send({ msg: "No deliveries found for the given challan number", type: "error" });
        }

        const filteredComps = findComps.filter((comp) => comp.deliveries.length > 0);

        if (filteredComps.length === 0) {
            return res.status(404).send({ msg: "No deliveries found for the given challan number", type: "error" });
        }

        return res.status(200).send({ data: filteredComps });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }

}

export const deliveryMonth = async (req: Request, res: Response) => {
    try {
        const getMonths = await prisma.deliveries.findMany({
            select: {
                deliveryMonth: true
            }
        });

        if (getMonths.length === 0) {
            return res.status(404).send({
                message: "No months found",
                type: "error"
            });
        }

        const monthOrder = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];

        const uniqueMonths = [
            ...new Set(
                getMonths
                    .map(({ deliveryMonth }) => deliveryMonth)
                    .filter(month => month !== "N/A")
                    .map(month => month.split(" ")[0])
            )
        ].sort(
            (a: any, b: any) => monthOrder.indexOf(a) - monthOrder.indexOf(b)
        );

        return res.status(200).send({
            data: uniqueMonths.map(deliveryMonth => ({
                deliveryMonth
            })),
            type: "success"
        });

    } catch (error) {
        console.error("Error fetching delivery months:", error);

        return res.status(500).send({
            message: "Failed to fetch delivery months",
            type: "error"
        });
    }
};