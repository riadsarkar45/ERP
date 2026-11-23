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

// The first knitting / yarn dyeing order created in a job is the job's BASE order.
//  - it (and more orders of the same type) take raw yarn from stock
//  - every other order type is limited to the lots the base order used, and its
//    qty comes from the base order qty
const BASE_ORDER_TYPES: string[] = [ORDER_TYPES.KNITTING, ORDER_TYPES.YARN_DYEING];

// Yarn dyeing movement that carries the Y/D batch number.
//  YD_FINISH_TYPE  = the delivery type that has the Batch No
//  YD_BATCH_FIELD  = !!! EDIT if needed !!! the column of the delivery row that holds the Batch No
const YD_FINISH_TYPE = "Finish Received";
const YD_BATCH_FIELD = "batchNo";

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
    yarnComposition: string;
    physicalQuantity: number;
    assignedQuantity: number;
    totalQuantity: number;
};

// Yarn dyeing lot / batch of the job, with the qty that is still free for the order type being created
type YdLot = {
    ydBatch: string;
    lotNo: string;
    yarnCount: string;
    yarnComposition: string; // "" when none or more than one composition is possible
    yarnCompositions: string[];
    piNo: string; // auto resolved PI ("" when none or more than one PI is possible)
    piNos: string[];
    colors: string[];
    bookedQuantity: number;
    usedQuantity: number; // already used by earlier orders of the order type being created
    availableQuantity: number;
};

// Batch numbers of the yarn dyeing Finish Received movements of the job
type YdBatch = {
    batchNo: string;
    finishReceivedQuantity: number;
    piNo: string;
    lots: { lotNo: string; yarnCount: string; yarnComposition: string; piNo: string }[];
};

type JobLot = {
    lotNo: string;
    yarnCount: string;
    yarnComposition: string;
    yarnCompositions: string[];
    piNo: string;
    piNos: string[];
    sources: string[];
    styleRequirementRowIds: number[];
    workOrderQuantity: number;
    availableQuantity: number | null; // from the base order (null = not limited by a base order)
};

type PrefillLine = {
    lotNo: string;
    yarnCount: string;
    yarnComposition: string;
    piNo: string;
    qty: number;
};

type PrefillRow = {
    styleRequirementRowId: number;
    lines: PrefillLine[];
};

type Prefill = {
    sourceOrderType: string | null;
    rows: PrefillRow[];
};

const EMPTY_PREFILL: Prefill = { sourceOrderType: null, rows: [] };

// One lot / yarn count / yarn composition / PI / qty line of a composition
type Line = {
    rowId: number | null; // styleRequirementRowId
    lotNo: string;
    yarnCount: string;
    yarnComposition: string;
    piNo: string;
    qty: number;
};

type CompLike = {
    styleRequirementRowId: unknown;
    lotNo: unknown;
    yarnCount: unknown;
    yarnComposition: unknown;
    piId: unknown;
    workOrderQty: unknown;
    yarnColors: { lotNo: unknown; yarnCount: unknown; piId: unknown; qty: unknown }[];
};

type JobComp = CompLike & {
    status?: unknown;
    workOrder: { id: number; orderType: string; createdAt: Date };
};

const COMP_LINE_SELECT = {
    styleRequirementRowId: true,
    lotNo: true,
    yarnCount: true,
    yarnComposition: true,
    piId: true,
    workOrderQty: true,
    yarnColors: {
        select: { lotNo: true, yarnCount: true, piId: true, qty: true },
    },
} as const;

// Only work orders that are NOT cancelled (unless the flag above is turned off)
const cancelFilter = () => (EXCLUDE_CANCELLED_WORK_ORDERS ? { isCancelled: false } : {});

const workOrderFilter = (orderType?: string) => ({
    ...(orderType ? { orderType } : {}),
    ...cancelFilter(),
});

// All lot lines of one composition:
//  - knitting / AOP / dyeing: the composition's own lot / count / PI / qty
//  - yarn dyeing:             every yarn color booking
// Yarn color bookings have no yarnComposition of their own: they use the
// yarnComposition of their parent composition.
// Lines without a lot (Y/D batch lines) are skipped.
const toLines = (c: CompLike): Line[] => {
    const rowRaw = c.styleRequirementRowId;
    const rowId =
        rowRaw === null || rowRaw === undefined || Number.isNaN(Number(rowRaw))
            ? null
            : Number(rowRaw);

    // the "NULL" default of the column becomes ""
    const rawYarnComposition = clean(c.yarnComposition);
    const yarnComposition = isBlank(rawYarnComposition) ? "" : rawYarnComposition;

    const lines: Line[] = [];

    const push = (lot: unknown, count: unknown, pi: unknown, qty: unknown) => {
        const lotNo = clean(lot);
        if (isBlank(lotNo)) return;

        const rawCount = clean(count);
        const rawPi = clean(pi);

        lines.push({
            rowId,
            lotNo,
            yarnCount: isBlank(rawCount) ? "" : rawCount,
            yarnComposition,
            piNo: isBlank(rawPi) ? "" : rawPi,
            qty: Number(qty) || 0,
        });
    };

    push(c.lotNo, c.yarnCount, c.piId, c.workOrderQty);

    for (const color of c.yarnColors) {
        push(color.lotNo, color.yarnCount, color.piId, color.qty);
    }

    return lines;
};

const bucketKey = (l: Line) =>
    JSON.stringify([norm(l.piNo), norm(l.lotNo), norm(l.yarnCount)]);

const lotCountKey = (l: { lotNo: string; yarnCount: string }) =>
    JSON.stringify([norm(l.lotNo), norm(l.yarnCount)]);

// The base order type of a job = type of the EARLIEST knitting / yarn dyeing work order
const findBaseOrderType = (comps: JobComp[]): string | null => {
    let best: { type: string; time: number; id: number } | null = null;

    for (const c of comps) {
        const wo = c.workOrder;
        if (!wo || !BASE_ORDER_TYPES.includes(wo.orderType)) continue;

        const time = new Date(wo.createdAt).getTime();

        if (
            !best ||
            time < best.time ||
            (time === best.time && wo.id < best.id)
        ) {
            best = { type: wo.orderType, time, id: wo.id };
        }
    }

    return best ? best.type : null;
};

// ---------------------------------------------------------------------------
// 0) PI + YARN COMPOSITION LOOKUP (auto select)
//    lot + count -> the PI numbers the spinning received this lot + count under,
//    and the yarn compositions of the PO items they belong to.
//    When a line has no PI / yarn composition saved and exactly ONE is possible,
//    that one is used.
// ---------------------------------------------------------------------------
type PiLookup = {
    pi: Map<string, string[]>;
    yarnComposition: Map<string, string[]>;
};

const getPiLookup = async (): Promise<PiLookup> => {
    const grouped = await prisma.spinningYarnMovement.groupBy({
        by: ["yarnPoItemsId", "lotNo", "yarnCount"],
        where: {
            movementType: { in: [MOVEMENT_TYPES.IN] },
            yarnPoItemsId: { not: null },
        },
        _sum: { movementQty: true },
    });

    const itemIds = [
        ...new Set(
            grouped
                .map((g) => g.yarnPoItemsId)
                .filter((id): id is number => id !== null)
        ),
    ];

    const items = await prisma.yarnPoItems.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, composition: true, yarnPo: { select: { piNo: true } } },
    });

    const piByItem = new Map<number, string>(
        items.map((item) => [item.id, clean(item.yarnPo?.piNo)])
    );
    const compByItem = new Map<number, string>(
        items.map((item) => [item.id, clean(item.composition)])
    );

    const piSets = new Map<string, Set<string>>();
    const compSets = new Map<string, Set<string>>();

    for (const g of grouped) {
        if (g.yarnPoItemsId === null) continue;

        const key = JSON.stringify([norm(g.lotNo), norm(g.yarnCount)]);

        const piNo = piByItem.get(g.yarnPoItemsId);
        if (piNo) {
            const set = piSets.get(key) ?? new Set<string>();
            set.add(piNo);
            piSets.set(key, set);
        }

        const comp = compByItem.get(g.yarnPoItemsId);
        if (comp && !isBlank(comp)) {
            const set = compSets.get(key) ?? new Set<string>();
            set.add(comp);
            compSets.set(key, set);
        }
    }

    const toSortedMap = (sets: Map<string, Set<string>>) => {
        const map = new Map<string, string[]>();
        for (const [key, set] of sets) map.set(key, Array.from(set).sort());
        return map;
    };

    return { pi: toSortedMap(piSets), yarnComposition: toSortedMap(compSets) };
};

// saved PI first, otherwise the only possible PI of this lot + count, otherwise ""
const resolvePi = (
    piNo: string,
    lotNo: string,
    yarnCount: string,
    lookup: PiLookup
): string => {
    if (!isBlank(piNo)) return piNo;

    const list = lookup.pi.get(lotCountKey({ lotNo, yarnCount }));
    return list && list.length === 1 ? list[0]! : "";
};

// saved yarn composition first, otherwise the only possible one of this lot + count, otherwise ""
const resolveYarnComposition = (
    value: string,
    lotNo: string,
    yarnCount: string,
    lookup: PiLookup
): string => {
    if (!isBlank(value)) return value;

    const list = lookup.yarnComposition.get(lotCountKey({ lotNo, yarnCount }));
    return list && list.length === 1 ? list[0]! : "";
};

// ---------------------------------------------------------------------------
// 1) RAW YARN: spinning balance minus what is already assigned
//
//    Spinning balance = Received From Spinning - Return To Spinning
//
//    Assigned (deducted) quantity comes from knitting work orders and yarn
//    dyeing bookings with status ASSIGNED, matched by exact PI + Lot + Count
//    when a PI is saved, otherwise by Lot + Count (older rows).
//
//    Raw yarn is taken ONCE per job: all lines of the job's base order type are
//    deducted. A line of another order type that uses a lot + count of the base
//    order is NOT deducted again (it reuses the base order's yarn). A line with
//    a lot the base order did not use is still deducted (older jobs).
//    AOP / Dyeing process fabric, so they never deduct raw yarn.
// ---------------------------------------------------------------------------
const getRawAssignedLines = async (
    excludeWorkOrderId: number | null
): Promise<Line[]> => {
    const comps = await prisma.composition.findMany({
        where: {
            ...(excludeWorkOrderId !== null
                ? { workOrderId: { not: excludeWorkOrderId } }
                : {}),
            workOrder: {
                orderType: { in: BASE_ORDER_TYPES },
                ...cancelFilter(),
            },
        },
        select: {
            ...COMP_LINE_SELECT,
            status: true,
            workOrder: {
                select: { id: true, jobNo: true, orderType: true, createdAt: true },
            },
        },
    });

    const byJob = new Map<string, typeof comps>();

    for (const c of comps) {
        const key = norm(c.workOrder?.jobNo);
        const list = byJob.get(key) ?? [];
        list.push(c);
        byJob.set(key, list);
    }

    const lines: Line[] = [];

    for (const jobComps of byJob.values()) {
        const baseType = findBaseOrderType(jobComps);

        // lots + counts the base order used
        const baseKeys = new Set<string>();
        for (const c of jobComps) {
            if (c.workOrder.orderType !== baseType) continue;
            for (const l of toLines(c)) baseKeys.add(lotCountKey(l));
        }

        for (const c of jobComps) {
            if (c.status !== ASSIGNED_STATUS) continue;

            const isBase = c.workOrder.orderType === baseType;

            for (const l of toLines(c)) {
                if (isBase || !baseKeys.has(lotCountKey(l))) lines.push(l);
            }
        }
    }

    return lines;
};

const getRawYarnInventory = async (
    excludeWorkOrderId: number | null
): Promise<{ data: RawYarnRow[]; warnings: Warning[] }> => {
    const [grouped, assignedLines] = await Promise.all([
        prisma.spinningYarnMovement.groupBy({
            by: ["yarnPoItemsId", "lotNo", "yarnCount", "movementType"],
            where: {
                movementType: { in: [MOVEMENT_TYPES.IN, MOVEMENT_TYPES.OUT] },
                yarnPoItemsId: { not: null },
            },
            _sum: { movementQty: true },
        }),

        getRawAssignedLines(excludeWorkOrderId),
    ]);

    // PO item -> PI number + yarn composition
    const itemIds = [
        ...new Set(
            grouped
                .map((g) => g.yarnPoItemsId)
                .filter((id): id is number => id !== null)
        ),
    ];

    const items = await prisma.yarnPoItems.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, composition: true, yarnPo: { select: { piNo: true } } },
    });

    const piByItem = new Map<number, string>(
        items.map((item) => [item.id, clean(item.yarnPo?.piNo)])
    );
    const compByItem = new Map<number, string>(
        items.map((item) => [item.id, clean(item.composition)])
    );

    // a) Net spinning balance per PI + Lot + Yarn Count
    const balances = new Map<
        string,
        {
            piNo: string;
            lotNo: string;
            yarnCount: string;
            yarnComposition: string;
            physicalQuantity: number;
        }
    >();

    for (const g of grouped) {
        if (g.yarnPoItemsId === null) continue;

        const piNo = piByItem.get(g.yarnPoItemsId);
        if (!piNo) continue;

        const rawComp = compByItem.get(g.yarnPoItemsId) ?? "";
        const yarnComposition = isBlank(rawComp) ? "" : rawComp;

        const lotNo = clean(g.lotNo);
        const yarnCount = clean(g.yarnCount);
        const key = JSON.stringify([norm(piNo), norm(lotNo), norm(yarnCount)]);
        const qty = g._sum.movementQty ?? 0;
        const signed = g.movementType === MOVEMENT_TYPES.IN ? qty : -qty;

        const current = balances.get(key);
        if (current) {
            current.physicalQuantity += signed;
            if (!current.yarnComposition) current.yarnComposition = yarnComposition;
        } else {
            balances.set(key, {
                piNo,
                lotNo,
                yarnCount,
                yarnComposition,
                physicalQuantity: signed,
            });
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

    for (const l of assignedLines) {
        addAssigned(l.piNo, l.lotNo, l.yarnCount, l.qty);
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
                yarnComposition: b.yarnComposition,
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
// 2) YARN DYEING LOTS / BATCHES (for every order type except yarn dyeing)
//    Lots + counts + colors + PI booked on the yarn dyeing work orders of this job.
//    availableQuantity = booked qty - qty already used by earlier orders of the
//    order type being created (same lot + count, same job).
// ---------------------------------------------------------------------------

// qty already used by orders of this type in this job, per lot + count
const getTargetUsage = async (
    jobNo: string,
    orderType: string,
    excludeWorkOrderId: number | null
): Promise<Map<string, number>> => {
    const comps = await prisma.composition.findMany({
        where: {
            ...(excludeWorkOrderId !== null
                ? { workOrderId: { not: excludeWorkOrderId } }
                : {}),
            workOrder: { jobNo, ...workOrderFilter(orderType) },
        },
        select: COMP_LINE_SELECT,
    });

    const used = new Map<string, number>();

    for (const c of comps) {
        for (const l of toLines(c)) {
            const key = lotCountKey(l);
            used.set(key, (used.get(key) ?? 0) + l.qty);
        }
    }

    return used;
};

const getYarnDyeingLots = async (
    jobNo: string,
    orderType: string,
    excludeWorkOrderId: number | null,
    lookup: PiLookup
): Promise<YdLot[]> => {
    const [bookings, usage] = await Promise.all([
        prisma.yarnColorBooking.findMany({
            where: {
                lotNo: { not: null },
                composition: {
                    workOrder: { jobNo, ...workOrderFilter(ORDER_TYPES.YARN_DYEING) },
                },
            },
            select: {
                lotNo: true,
                yarnCount: true,
                piId: true,
                color: true,
                qty: true,
                composition: { select: { yarnComposition: true } },
            },
        }),
        getTargetUsage(jobNo, orderType, excludeWorkOrderId),
    ]);

    const lots = new Map<
        string,
        {
            lotNo: string;
            yarnCount: string;
            pis: Set<string>;
            comps: Set<string>;
            colors: Set<string>;
            bookedQuantity: number;
        }
    >();

    for (const b of bookings) {
        const lotNo = clean(b.lotNo);
        const yarnCount = clean(b.yarnCount);
        if (isBlank(lotNo)) continue;

        const key = JSON.stringify([norm(lotNo), norm(yarnCount)]);
        const entry =
            lots.get(key) ??
            {
                lotNo,
                yarnCount: isBlank(yarnCount) ? "" : yarnCount,
                pis: new Set<string>(),
                comps: new Set<string>(),
                colors: new Set<string>(),
                bookedQuantity: 0,
            };

        entry.bookedQuantity += b.qty ?? 0;

        const color = clean(b.color);
        if (color) entry.colors.add(color);

        const pi = clean(b.piId);
        if (!isBlank(pi)) entry.pis.add(pi);

        const yc = clean(b.composition?.yarnComposition);
        if (!isBlank(yc)) entry.comps.add(yc);

        lots.set(key, entry);
    }

    return Array.from(lots.entries())
        .map(([key, l]) => {
            const used = usage.get(key) ?? 0;
            const piNos = Array.from(l.pis).sort();
            const piNo = piNos.length === 1 ? piNos[0]! : resolvePi("", l.lotNo, l.yarnCount, lookup);

            const yarnCompositions = Array.from(l.comps).sort();
            const yarnComposition =
                yarnCompositions.length === 1
                    ? yarnCompositions[0]!
                    : resolveYarnComposition("", l.lotNo, l.yarnCount, lookup);

            return {
                ydBatch: l.lotNo,
                lotNo: l.lotNo,
                yarnCount: l.yarnCount,
                yarnComposition,
                yarnCompositions: yarnCompositions.length
                    ? yarnCompositions
                    : yarnComposition
                        ? [yarnComposition]
                        : [],
                piNo,
                piNos: piNos.length ? piNos : piNo ? [piNo] : [],
                colors: Array.from(l.colors).sort(),
                bookedQuantity: round3(l.bookedQuantity),
                usedQuantity: round3(Math.min(used, l.bookedQuantity)),
                availableQuantity: round3(Math.max(l.bookedQuantity - used, 0)),
            };
        })
        .filter((l) => l.availableQuantity > EPSILON)
        .sort((a, b) => a.lotNo.localeCompare(b.lotNo) || a.yarnCount.localeCompare(b.yarnCount));
};

// Batch numbers entered on the yarn dyeing "Finish Received" movements of this job.
// A failure here never breaks the response: it is reported as a warning instead.
const getYdFinishBatches = async (
    jobNo: string,
    lookup: PiLookup
): Promise<{ data: YdBatch[]; warnings: Warning[] }> => {
    try {
        const comps: any[] = await prisma.composition.findMany({
            where: { workOrder: { jobNo, ...workOrderFilter(ORDER_TYPES.YARN_DYEING) } },
            select: {
                ...COMP_LINE_SELECT,
                deliveries: {
                    where: { deliveryType: YD_FINISH_TYPE },
                    select: { deliveryQty: true, [YD_BATCH_FIELD]: true },
                },
            },
        } as any);

        const batches = new Map<
            string,
            {
                batchNo: string;
                qty: number;
                lots: Map<
                    string,
                    { lotNo: string; yarnCount: string; yarnComposition: string; piNo: string }
                >;
            }
        >();

        for (const c of comps) {
            const lines = toLines(c);

            for (const d of c.deliveries ?? []) {
                const batchNo = clean(d[YD_BATCH_FIELD]);
                if (isBlank(batchNo)) continue;

                const key = norm(batchNo);
                const entry = batches.get(key) ?? { batchNo, qty: 0, lots: new Map() };
                entry.qty += Number(d.deliveryQty) || 0;

                for (const l of lines) {
                    entry.lots.set(lotCountKey(l), {
                        lotNo: l.lotNo,
                        yarnCount: l.yarnCount,
                        yarnComposition: resolveYarnComposition(
                            l.yarnComposition,
                            l.lotNo,
                            l.yarnCount,
                            lookup
                        ),
                        piNo: resolvePi(l.piNo, l.lotNo, l.yarnCount, lookup),
                    });
                }

                batches.set(key, entry);
            }
        }

        const data: YdBatch[] = Array.from(batches.values())
            .map((b) => {
                const lots = Array.from(b.lots.values());
                const pis = [...new Set(lots.map((l) => l.piNo).filter((p) => !isBlank(p)))];

                return {
                    batchNo: b.batchNo,
                    finishReceivedQuantity: round3(b.qty),
                    piNo: pis.length === 1 ? pis[0]! : "",
                    lots,
                };
            })
            .sort((a, b) => a.batchNo.localeCompare(b.batchNo));

        return { data, warnings: [] };
    } catch (error) {
        console.error("Failed to read yarn dyeing batch numbers:", error);

        return {
            data: [],
            warnings: [{ type: "YD_BATCH_LOOKUP_FAILED", key: YD_BATCH_FIELD, quantity: 0 }],
        };
    }
};

// ---------------------------------------------------------------------------
// 3) JOB LOTS (for AOP / Dyeing orders)
//    Looks at ANY type of work placed for this job (knitting, yarn dyeing,
//    dyeing, AOP) and returns the distinct lot + count pairs it used, with the
//    PI and the yarn composition.
// ---------------------------------------------------------------------------
const getJobLots = async (
    jobNo: string,
    lookup: PiLookup,
    inventory: RawYarnRow[],
    restricted: boolean
): Promise<JobLot[]> => {
    const compositions = await prisma.composition.findMany({
        where: { workOrder: { jobNo, ...workOrderFilter() } },
        select: {
            styleRequirementRowId: true,
            lotNo: true,
            yarnCount: true,
            yarnComposition: true,
            piId: true,
            workOrderQty: true,
            workOrder: { select: { orderType: true } },
            yarnColors: { select: { lotNo: true, yarnCount: true, piId: true, qty: true } },
        },
    });

    const lots = new Map<
        string,
        {
            lotNo: string;
            yarnCount: string;
            pis: Set<string>;
            comps: Set<string>;
            sources: Set<string>;
            rowIds: Set<number>;
            qty: number;
        }
    >();

    const add = (
        lotValue: unknown,
        countValue: unknown,
        piValue: unknown,
        compValue: unknown,
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
                pis: new Set<string>(),
                comps: new Set<string>(),
                sources: new Set<string>(),
                rowIds: new Set<number>(),
                qty: 0,
            };

        const pi = clean(piValue);
        if (!isBlank(pi)) entry.pis.add(pi);

        const yc = clean(compValue);
        if (!isBlank(yc)) entry.comps.add(yc);

        entry.sources.add(source);
        if (rowId !== null) entry.rowIds.add(rowId);
        entry.qty += qty;

        lots.set(key, entry);
    };

    for (const c of compositions) {
        const source = c.workOrder?.orderType ?? "";
        const rowId = c.styleRequirementRowId ?? null;

        add(c.lotNo, c.yarnCount, c.piId, c.yarnComposition, source, rowId, c.workOrderQty ?? 0);

        // yarn color bookings use the yarnComposition of their parent composition
        for (const color of c.yarnColors) {
            add(color.lotNo, color.yarnCount, color.piId, c.yarnComposition, source, rowId, color.qty ?? 0);
        }
    }

    // available qty of a lot + count = what the base order still allows
    const available = new Map<string, number>();
    for (const r of inventory) {
        const key = lotCountKey(r);
        available.set(key, (available.get(key) ?? 0) + r.totalQuantity);
    }

    return Array.from(lots.entries())
        .map(([key, l]) => {
            const piNos = Array.from(l.pis).sort();
            const piNo = piNos.length === 1 ? piNos[0]! : resolvePi("", l.lotNo, l.yarnCount, lookup);

            const yarnCompositions = Array.from(l.comps).sort();
            const yarnComposition =
                yarnCompositions.length === 1
                    ? yarnCompositions[0]!
                    : resolveYarnComposition("", l.lotNo, l.yarnCount, lookup);

            return {
                lotNo: l.lotNo,
                yarnCount: l.yarnCount,
                yarnComposition,
                yarnCompositions: yarnCompositions.length
                    ? yarnCompositions
                    : yarnComposition
                        ? [yarnComposition]
                        : [],
                piNo,
                piNos: piNos.length ? piNos : piNo ? [piNo] : [],
                sources: Array.from(l.sources).sort(),
                styleRequirementRowIds: Array.from(l.rowIds).sort((a, b) => a - b),
                workOrderQuantity: round3(l.qty),
                availableQuantity: restricted ? round3(available.get(key) ?? 0) : null,
            };
        })
        .sort((a, b) => a.lotNo.localeCompare(b.lotNo) || a.yarnCount.localeCompare(b.yarnCount));
};

// ---------------------------------------------------------------------------
// 4) JOB CONTEXT
//    The job's base order (first knitting / yarn dyeing order). When the order
//    being created is NOT of the base type, its lots are limited to the lots the
//    base order selected, the available qty = base qty - qty used by earlier
//    orders of this type, and the PI / lot / count / yarn composition / qty is
//    prefilled per composition.
// ---------------------------------------------------------------------------
type JobContext = {
    baseOrderType: string | null;
    restricted: boolean;
    inventory: RawYarnRow[];
    prefill: Prefill;
};

const NO_JOB_CONTEXT: JobContext = {
    baseOrderType: null,
    restricted: false,
    inventory: [],
    prefill: EMPTY_PREFILL,
};

const getJobContext = async (
    jobNo: string,
    orderType: string,
    excludeWorkOrderId: number | null
): Promise<JobContext> => {
    const types = Array.from(new Set([...BASE_ORDER_TYPES, orderType]));

    const comps = await prisma.composition.findMany({
        where: {
            ...(excludeWorkOrderId !== null
                ? { workOrderId: { not: excludeWorkOrderId } }
                : {}),
            workOrder: { jobNo, orderType: { in: types }, ...cancelFilter() },
        },
        select: {
            ...COMP_LINE_SELECT,
            workOrder: { select: { id: true, orderType: true, createdAt: true } },
        },
    });

    const baseType = findBaseOrderType(comps);

    if (!baseType) return NO_JOB_CONTEXT;

    if (baseType === orderType) {
        return { ...NO_JOB_CONTEXT, baseOrderType: baseType };
    }

    // Base qty (what the base order took) and used qty (what earlier orders of
    // THIS type already used), per PI + Lot + Count and per composition
    const baseTotals = new Map<
        string,
        {
            piNo: string;
            lotNo: string;
            yarnCount: string;
            yarnComposition: string;
            qty: number;
        }
    >();
    const usedTotals = new Map<string, number>();

    const rowBase = new Map<string, { rowId: number; line: Line; qty: number }>();
    const rowUsed = new Map<string, number>();

    for (const c of comps) {
        const type = c.workOrder.orderType;
        const isBase = type === baseType;
        const isTarget = type === orderType;

        if (!isBase && !isTarget) continue;

        for (const l of toLines(c)) {
            const key = bucketKey(l);

            if (isBase) {
                const total = baseTotals.get(key) ?? {
                    piNo: l.piNo,
                    lotNo: l.lotNo,
                    yarnCount: l.yarnCount,
                    yarnComposition: l.yarnComposition,
                    qty: 0,
                };
                total.qty += l.qty;
                if (!total.yarnComposition) total.yarnComposition = l.yarnComposition;
                baseTotals.set(key, total);
            }

            if (isTarget) {
                usedTotals.set(key, (usedTotals.get(key) ?? 0) + l.qty);
            }

            if (l.rowId !== null) {
                const rowKey = `${l.rowId}|${key}`;

                if (isBase) {
                    const current = rowBase.get(rowKey) ?? {
                        rowId: l.rowId,
                        line: l,
                        qty: 0,
                    };
                    current.qty += l.qty;
                    if (!current.line.yarnComposition && l.yarnComposition) {
                        current.line = { ...current.line, yarnComposition: l.yarnComposition };
                    }
                    rowBase.set(rowKey, current);
                }

                if (isTarget) {
                    rowUsed.set(rowKey, (rowUsed.get(rowKey) ?? 0) + l.qty);
                }
            }
        }
    }

    // Available per PI + Lot + Count = base qty - qty used by earlier orders of this type
    const inventory: RawYarnRow[] = Array.from(baseTotals.entries())
        .map(([key, b]) => {
            const used = usedTotals.get(key) ?? 0;

            return {
                piNo: b.piNo,
                lotNo: b.lotNo,
                yarnCount: b.yarnCount,
                yarnComposition: b.yarnComposition,
                physicalQuantity: round3(b.qty),
                assignedQuantity: round3(Math.min(used, b.qty)),
                totalQuantity: round3(Math.max(b.qty - used, 0)),
            };
        })
        .filter((r) => r.totalQuantity > 0)
        .sort(
            (a, b) =>
                a.lotNo.localeCompare(b.lotNo) ||
                a.yarnCount.localeCompare(b.yarnCount) ||
                a.piNo.localeCompare(b.piNo)
        );

    // Remaining base qty per composition (styleRequirementRowId)
    const prefillByRow = new Map<number, PrefillLine[]>();

    for (const [rowKey, base] of rowBase) {
        const remaining = base.qty - (rowUsed.get(rowKey) ?? 0);
        if (remaining <= EPSILON) continue;

        const lines = prefillByRow.get(base.rowId) ?? [];
        lines.push({
            lotNo: base.line.lotNo,
            yarnCount: base.line.yarnCount,
            yarnComposition: base.line.yarnComposition,
            piNo: base.line.piNo,
            qty: round3(remaining),
        });
        prefillByRow.set(base.rowId, lines);
    }

    const prefill: Prefill =
        prefillByRow.size > 0
            ? {
                sourceOrderType: baseType,
                rows: Array.from(prefillByRow.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([styleRequirementRowId, lines]) => ({
                        styleRequirementRowId,
                        lines: lines.sort((a, b) => b.qty - a.qty),
                    })),
            }
            : EMPTY_PREFILL;

    return { baseOrderType: baseType, restricted: true, inventory, prefill };
};

// Fill the PI / yarn composition of lines that have none (when exactly one is
// possible), then merge rows that became identical so the same PI + lot + count
// is never listed twice
const withResolvedPi = (
    context: JobContext,
    lookup: PiLookup
): JobContext => {
    const merged = new Map<string, RawYarnRow>();

    for (const r of context.inventory) {
        const piNo = resolvePi(r.piNo, r.lotNo, r.yarnCount, lookup);
        const yarnComposition = resolveYarnComposition(
            r.yarnComposition,
            r.lotNo,
            r.yarnCount,
            lookup
        );
        const key = JSON.stringify([norm(piNo), norm(r.lotNo), norm(r.yarnCount)]);
        const current = merged.get(key);

        if (current) {
            current.physicalQuantity = round3(current.physicalQuantity + r.physicalQuantity);
            current.assignedQuantity = round3(current.assignedQuantity + r.assignedQuantity);
            current.totalQuantity = round3(current.totalQuantity + r.totalQuantity);
            if (!current.yarnComposition) current.yarnComposition = yarnComposition;
        } else {
            merged.set(key, { ...r, piNo, yarnComposition });
        }
    }

    const prefill: Prefill = {
        sourceOrderType: context.prefill.sourceOrderType,
        rows: context.prefill.rows.map((row) => {
            const lines = new Map<string, PrefillLine>();

            for (const l of row.lines) {
                const piNo = resolvePi(l.piNo, l.lotNo, l.yarnCount, lookup);
                const yarnComposition = resolveYarnComposition(
                    l.yarnComposition,
                    l.lotNo,
                    l.yarnCount,
                    lookup
                );
                const key = JSON.stringify([norm(piNo), norm(l.lotNo), norm(l.yarnCount)]);
                const current = lines.get(key);

                if (current) {
                    current.qty = round3(current.qty + l.qty);
                    if (!current.yarnComposition) current.yarnComposition = yarnComposition;
                } else {
                    lines.set(key, { ...l, piNo, yarnComposition });
                }
            }

            return {
                styleRequirementRowId: row.styleRequirementRowId,
                lines: Array.from(lines.values()).sort((a, b) => b.qty - a.qty),
            };
        }),
    };

    return { ...context, inventory: Array.from(merged.values()), prefill };
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

        // Base order of the job (first knitting / yarn dyeing order) + PI / yarn composition lookup
        const [rawContext, lookup] = await Promise.all([
            jobNo
                ? getJobContext(jobNo, orderType, excludeWorkOrderId)
                : Promise.resolve(NO_JOB_CONTEXT),
            getPiLookup(),
        ]);

        const context = withResolvedPi(rawContext, lookup);

        // Yarn dyeing lots + batch numbers are offered to every order type except yarn dyeing itself
        const wantsYdLots = !!jobNo && orderType !== ORDER_TYPES.YARN_DYEING;

        const [raw, ydLots, ydBatchResult, jobLots] = await Promise.all([
            // restricted: only the base order's lots (qty = base qty - already used)
            // not restricted: the full yarn stock (first time in this job)
            context.restricted
                ? Promise.resolve<{ data: RawYarnRow[]; warnings: Warning[] }>({
                    data: context.inventory,
                    warnings: [],
                })
                : getRawYarnInventory(excludeWorkOrderId),

            wantsYdLots
                ? getYarnDyeingLots(jobNo, orderType, excludeWorkOrderId, lookup)
                : Promise.resolve<YdLot[]>([]),

            wantsYdLots
                ? getYdFinishBatches(jobNo, lookup)
                : Promise.resolve<{ data: YdBatch[]; warnings: Warning[] }>({ data: [], warnings: [] }),

            !usesRawYarn
                ? getJobLots(jobNo, lookup, context.inventory, context.restricted)
                : Promise.resolve<JobLot[]>([]),
        ]);

        return res.status(200).json({
            success: true,
            orderType,
            jobNo: jobNo || null,
            restricted: context.restricted,       // true = limited to the base order's lots
            baseOrderType: context.baseOrderType, // first knitting / yarn dyeing order type of the job
            count: raw.data.length,
            data: raw.data,   // lots to choose from + PI + yarn composition + available qty
            ydLots,           // yarn dyeing lots / batches of this job + PI + yarn composition + available qty
            ydBatches: ydBatchResult.data, // batch numbers of the yarn dyeing Finish Received movements
            jobLots,          // lots + counts already used by this job (AOP / dyeing) + PI + yarn composition
            prefill: context.prefill, // remaining base qty per composition + lot + count + yarn composition + PI
            warnings: [...raw.warnings, ...ydBatchResult.warnings],
        });
    } catch (error) {
        console.error("Failed to fetch lots and yarn counts:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch lots and yarn counts",
        });
    }
};