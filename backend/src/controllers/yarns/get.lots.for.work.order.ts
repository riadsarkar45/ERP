import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const MOVEMENT_TYPES = {
    IN: "Received From Spinning",
    OUT: "Return To Spinning",
} as const;

const ORDER_TYPES = {
    KNITTING: "knittingOrder",
    YARN_DYEING: "yarnDyeingOrder",
    AOP: "aopOrder",
    DYEING: "dyeingOrder",
} as const;

const VALID_ORDER_TYPES: readonly string[] = Object.values(ORDER_TYPES);

const ASSIGNED_STATUS = "ASSIGNED";
const EXCLUDE_CANCELLED_WORK_ORDERS = true;
const EPSILON = 0.0005; // ignore float dust below 0.0005

const clean = (v: unknown) => String(v ?? "").trim();
const norm = (v: unknown) => clean(v).toLowerCase();
const isBlank = (v: string) => v === "" || v.toLowerCase() === "null";
const round3 = (n: number) => Number(n.toFixed(3));

type Warning = { type: string; key: unknown; quantity: number };

type RawYarnRow = {
    piNo: string;
    lotNo: string;
    yarnCount: string;
    physicalQuantity: number;
    assignedQuantity: number;
    totalQuantity: number;
};

type YdLot = {
    ydBatch: string;
    lotNo: string;
    yarnCount: string;
    colors: string[];
    bookedQuantity: number;
};

type JobLot = {
    lotNo: string;
    yarnCount: string;
    sources: string[];
    styleRequirementRowIds: number[];
    workOrderQuantity: number;
};

// Only work orders that are NOT cancelled (unless the flag above is turned off)
const workOrderFilter = (orderType?: string) => ({
    ...(orderType ? { orderType } : {}),
    ...(EXCLUDE_CANCELLED_WORK_ORDERS ? { isCancelled: false } : {}),
});

// ---------------------------------------------------------------------------
// 1) RAW YARN: spinning balance minus what is already assigned
//
//    Spinning balance = Received From Spinning - Return To Spinning
//
//    Assigned (deducted) quantity comes from:
//      a) Knitting work order compositions with status ASSIGNED
//      b) Yarn dyeing bookings (YarnColorBooking.qty) of yarn dyeing work orders
//
//    Both are matched by exact PI + Lot + Count when a PI is saved, otherwise
//    by Lot + Count (older rows). AOP / Dyeing work orders process fabric, not
//    raw yarn, so they are NOT deducted. Knitting lines that use a Y/D batch
//    have no raw lot, so they are skipped.
// ---------------------------------------------------------------------------
const getRawYarnInventory = async (
    excludeWorkOrderId: number | null
): Promise<{ data: RawYarnRow[]; warnings: Warning[] }> => {
    const hasExclude = excludeWorkOrderId !== null;

    const [grouped, knittingAssigned, dyeingBookings] = await Promise.all([
        prisma.spinningYarnMovement.groupBy({
            by: ["yarnPoItemsId", "lotNo", "yarnCount", "movementType"],
            where: {
                movementType: { in: [MOVEMENT_TYPES.IN, MOVEMENT_TYPES.OUT] },
                yarnPoItemsId: { not: null },
            },
            _sum: { movementQty: true },
        }),

        prisma.composition.groupBy({
            by: ["piId", "lotNo", "yarnCount"],
            where: {
                status: ASSIGNED_STATUS,
                lotNo: { not: null },
                yarnCount: { not: null },
                ...(hasExclude ? { workOrderId: { not: excludeWorkOrderId } } : {}),
                workOrder: workOrderFilter(ORDER_TYPES.KNITTING),
            },
            _sum: { workOrderQty: true },
        }),

        prisma.yarnColorBooking.groupBy({
            by: ["piId", "lotNo", "yarnCount"],
            where: {
                lotNo: { not: null },
                yarnCount: { not: null },
                composition: {
                    status: ASSIGNED_STATUS,
                    ...(hasExclude ? { workOrderId: { not: excludeWorkOrderId } } : {}),
                    workOrder: workOrderFilter(ORDER_TYPES.YARN_DYEING),
                },
            },
            _sum: { qty: true },
        }),
    ]);

    // PO item -> PI number
    const itemIds = [
        ...new Set(
            grouped
                .map((g) => g.yarnPoItemsId)
                .filter((id): id is number => id !== null)
        ),
    ];

    const items = await prisma.yarnPoItems.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, yarnPo: { select: { piNo: true } } },
    });

    const piByItem = new Map<number, string>(
        items.map((item) => [item.id, clean(item.yarnPo?.piNo)])
    );

    // a) Net spinning balance per PI + Lot + Yarn Count
    const balances = new Map<
        string,
        { piNo: string; lotNo: string; yarnCount: string; physicalQuantity: number }
    >();

    for (const g of grouped) {
        if (g.yarnPoItemsId === null) continue;

        const piNo = piByItem.get(g.yarnPoItemsId);
        if (!piNo) continue;

        const lotNo = clean(g.lotNo);
        const yarnCount = clean(g.yarnCount);
        const key = JSON.stringify([norm(piNo), norm(lotNo), norm(yarnCount)]);
        const qty = g._sum.movementQty ?? 0;
        const signed = g.movementType === MOVEMENT_TYPES.IN ? qty : -qty;

        const current = balances.get(key);
        if (current) {
            current.physicalQuantity += signed;
        } else {
            balances.set(key, { piNo, lotNo, yarnCount, physicalQuantity: signed });
        }
    }

    // b) Assigned qty: exact (PI + Lot + Count) or pool (Lot + Count, no PI)
    const exactAssigned = new Map<string, number>();
    const poolAssigned = new Map<string, number>();

    const addAssigned = (
        piValue: unknown,
        lotValue: unknown,
        countValue: unknown,
        qty: number
    ) => {
        const piNo = clean(piValue);
        const lotNo = clean(lotValue);
        const yarnCount = clean(countValue);

        // Y/D batch lines carry no raw lot: they do not use raw yarn stock
        if (qty <= 0 || isBlank(lotNo) || isBlank(yarnCount)) return;

        if (!isBlank(piNo)) {
            const key = JSON.stringify([norm(piNo), norm(lotNo), norm(yarnCount)]);
            exactAssigned.set(key, (exactAssigned.get(key) ?? 0) + qty);
        } else {
            const key = JSON.stringify([norm(lotNo), norm(yarnCount)]);
            poolAssigned.set(key, (poolAssigned.get(key) ?? 0) + qty);
        }
    };

    for (const a of knittingAssigned) {
        addAssigned(a.piId, a.lotNo, a.yarnCount, a._sum.workOrderQty ?? 0);
    }

    for (const b of dyeingBookings) {
        addAssigned(b.piId, b.lotNo, b.yarnCount, b._sum.qty ?? 0);
    }

    // c) Allocate assigned qty against stock rows
    const sortedEntries = Array.from(balances.entries()).sort(
        ([, a], [, b]) =>
            a.lotNo.localeCompare(b.lotNo) ||
            a.yarnCount.localeCompare(b.yarnCount) ||
            a.piNo.localeCompare(b.piNo)
    );

    const data: RawYarnRow[] = sortedEntries
        .map(([exactKey, b]) => {
            const poolKey = JSON.stringify([norm(b.lotNo), norm(b.yarnCount)]);

            let available = Math.max(b.physicalQuantity, 0);
            let assigned = 0;

            const exact = exactAssigned.get(exactKey) ?? 0;
            const exactUsed = Math.min(exact, available);
            assigned += exactUsed;
            available -= exactUsed;
            exactAssigned.set(exactKey, exact - exactUsed); // remainder = over-assigned

            const pool = poolAssigned.get(poolKey) ?? 0;
            if (pool > 0 && available > 0) {
                const poolUsed = Math.min(pool, available);
                assigned += poolUsed;
                available -= poolUsed;
                poolAssigned.set(poolKey, pool - poolUsed);
            }

            return {
                piNo: b.piNo,
                lotNo: b.lotNo,
                yarnCount: b.yarnCount,
                physicalQuantity: round3(b.physicalQuantity), // received - returned
                assignedQuantity: round3(assigned),           // already assigned
                totalQuantity: round3(available),             // available for a new work order
            };
        })
        .filter((b) => b.totalQuantity > 0);

    // d) Anything left over could not be matched to stock: report it
    const warnings: Warning[] = [];

    for (const [key, qty] of exactAssigned) {
        if (qty > EPSILON) {
            warnings.push({
                type: "ASSIGNED_EXCEEDS_OR_NO_MATCHING_STOCK",
                key: JSON.parse(key), // [pi, lot, count]
                quantity: round3(qty),
            });
        }
    }
    for (const [key, qty] of poolAssigned) {
        if (qty > EPSILON) {
            warnings.push({
                type: "ASSIGNED_WITHOUT_PI_EXCEEDS_STOCK",
                key: JSON.parse(key), // [lot, count]
                quantity: round3(qty),
            });
        }
    }

    return { data, warnings };
};

// ---------------------------------------------------------------------------
// 2) YARN DYEING LOTS (for knitting orders)
//    Lots + counts + colors booked on the yarn dyeing work orders of this job.
// ---------------------------------------------------------------------------
const getYarnDyeingLots = async (jobNo: string): Promise<YdLot[]> => {
    const bookings = await prisma.yarnColorBooking.findMany({
        where: {
            lotNo: { not: null },
            composition: {
                workOrder: { jobNo, ...workOrderFilter(ORDER_TYPES.YARN_DYEING) },
            },
        },
        select: { lotNo: true, yarnCount: true, color: true, qty: true },
    });

    const lots = new Map<
        string,
        { lotNo: string; yarnCount: string; colors: Set<string>; bookedQuantity: number }
    >();

    for (const b of bookings) {
        const lotNo = clean(b.lotNo);
        const yarnCount = clean(b.yarnCount);
        if (isBlank(lotNo)) continue;

        const key = JSON.stringify([norm(lotNo), norm(yarnCount)]);
        const entry =
            lots.get(key) ??
            { lotNo, yarnCount: isBlank(yarnCount) ? "" : yarnCount, colors: new Set<string>(), bookedQuantity: 0 };

        entry.bookedQuantity += b.qty ?? 0;
        const color = clean(b.color);
        if (color) entry.colors.add(color);

        lots.set(key, entry);
    }

    return Array.from(lots.values())
        .map((l) => ({
            ydBatch: l.lotNo,
            lotNo: l.lotNo,
            yarnCount: l.yarnCount,
            colors: Array.from(l.colors).sort(),
            bookedQuantity: round3(l.bookedQuantity),
        }))
        .sort((a, b) => a.lotNo.localeCompare(b.lotNo) || a.yarnCount.localeCompare(b.yarnCount));
};

// ---------------------------------------------------------------------------
// 3) JOB LOTS (for AOP / Dyeing orders)
//    Looks at ANY type of work placed for this job (knitting, yarn dyeing,
//    dyeing, AOP) and returns the distinct lot + count pairs it used.
// ---------------------------------------------------------------------------
const getJobLots = async (jobNo: string): Promise<JobLot[]> => {
    const compositions = await prisma.composition.findMany({
        where: { workOrder: { jobNo, ...workOrderFilter() } },
        select: {
            styleRequirementRowId: true,
            lotNo: true,
            yarnCount: true,
            workOrderQty: true,
            workOrder: { select: { orderType: true } },
            yarnColors: { select: { lotNo: true, yarnCount: true, qty: true } },
        },
    });

    const lots = new Map<
        string,
        {
            lotNo: string;
            yarnCount: string;
            sources: Set<string>;
            rowIds: Set<number>;
            qty: number;
        }
    >();

    const add = (
        lotValue: unknown,
        countValue: unknown,
        source: string,
        rowId: number | null,
        qty: number
    ) => {
        const lotNo = clean(lotValue);
        const yarnCount = clean(countValue);
        if (isBlank(lotNo)) return;

        const key = JSON.stringify([norm(lotNo), norm(yarnCount)]);
        const entry =
            lots.get(key) ??
            {
                lotNo,
                yarnCount: isBlank(yarnCount) ? "" : yarnCount,
                sources: new Set<string>(),
                rowIds: new Set<number>(),
                qty: 0,
            };

        entry.sources.add(source);
        if (rowId !== null) entry.rowIds.add(rowId);
        entry.qty += qty;

        lots.set(key, entry);
    };

    for (const c of compositions) {
        const source = c.workOrder?.orderType ?? "";
        const rowId = c.styleRequirementRowId ?? null;

        add(c.lotNo, c.yarnCount, source, rowId, c.workOrderQty ?? 0);

        for (const color of c.yarnColors) {
            add(color.lotNo, color.yarnCount, source, rowId, color.qty ?? 0);
        }
    }

    return Array.from(lots.values())
        .map((l) => ({
            lotNo: l.lotNo,
            yarnCount: l.yarnCount,
            sources: Array.from(l.sources).sort(),
            styleRequirementRowIds: Array.from(l.rowIds).sort((a, b) => a - b),
            workOrderQuantity: round3(l.qty),
        }))
        .sort((a, b) => a.lotNo.localeCompare(b.lotNo) || a.yarnCount.localeCompare(b.yarnCount));
};

// ---------------------------------------------------------------------------
// Controller
//   GET /api/lots-work-orders/:orderType?jobNo=...&excludeWorkOrderId=...
// ---------------------------------------------------------------------------
export const getLotsAndYarnCounts = async (req: Request, res: Response) => {
    try {
        const orderType = clean(req.params.orderType ?? req.query.orderType);
        const jobNo = clean(req.query.jobNo);

        if (!VALID_ORDER_TYPES.includes(orderType)) {
            return res.status(400).json({
                success: false,
                message: `Invalid order type. Use one of: ${VALID_ORDER_TYPES.join(", ")}`,
            });
        }

        const usesRawYarn =
            orderType === ORDER_TYPES.KNITTING || orderType === ORDER_TYPES.YARN_DYEING;

        // Every type except yarn dyeing also looks at the job's other work
        if (orderType !== ORDER_TYPES.YARN_DYEING && !jobNo) {
            return res.status(400).json({
                success: false,
                message: "jobNo is required for this order type",
            });
        }

        // When editing a work order, pass ?excludeWorkOrderId=123 so its own
        // assigned qty is not deducted from availability.
        const excludeParam = Number(req.query.excludeWorkOrderId);
        const excludeWorkOrderId =
            Number.isInteger(excludeParam) && excludeParam > 0 ? excludeParam : null;

        const [raw, ydLots, jobLots] = await Promise.all([
            usesRawYarn
                ? getRawYarnInventory(excludeWorkOrderId)
                : Promise.resolve<{ data: RawYarnRow[]; warnings: Warning[] }>({
                    data: [],
                    warnings: [],
                }),

            orderType === ORDER_TYPES.KNITTING
                ? getYarnDyeingLots(jobNo)
                : Promise.resolve<YdLot[]>([]),

            !usesRawYarn ? getJobLots(jobNo) : Promise.resolve<JobLot[]>([]),
        ]);

        return res.status(200).json({
            success: true,
            orderType,
            jobNo: jobNo || null,
            count: raw.data.length,
            data: raw.data,   // raw yarn stock (knitting + yarn dyeing)
            ydLots,           // yarn dyeing lots of this job (knitting only)
            jobLots,          // lots + counts already used by this job (AOP / dyeing)
            warnings: raw.warnings,
        });
    } catch (error) {
        console.error("Failed to fetch lots and yarn counts:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch lots and yarn counts",
        });
    }
};