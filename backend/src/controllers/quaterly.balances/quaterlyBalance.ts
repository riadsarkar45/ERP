import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";

// ====== matched to schema.prisma (no @@map, so table names = model names, case-sensitive) ======
const T = {
    deliveries: Prisma.raw('"deliveries"'),
    composition: Prisma.raw('"Composition"'),
    workOrder: Prisma.raw('"WorkOrder"'),
};
const COL = {
    deliveryCompositionId: Prisma.raw('"yarnCompId"'),   // deliveries.yarnCompId -> Composition.id
    compositionWorkOrderId: Prisma.raw('"workOrderId"'), // Composition.workOrderId -> WorkOrder.id
};
// ===============================================================================================

const FINISH_IN_BALANCE = false;
const MAX_DETAIL_ROWS = 50000;

// ----- small in-memory cache (per server process) -----
const SERVER_TTL_MS = 60 * 1000;
const SERVER_CACHE_MAX = 300;
const SERVER_CACHE = new Map<string, { at: number; data: any }>();

const cached = async <T>(req: Request, key: string, produce: () => Promise<T>): Promise<T> => {
    const bypass = req.query.fresh === "1";
    if (!bypass) {
        const hit = SERVER_CACHE.get(key);
        if (hit && Date.now() - hit.at < SERVER_TTL_MS) return hit.data as T;
    }
    const data = await produce();
    SERVER_CACHE.set(key, { at: Date.now(), data });
    if (SERVER_CACHE.size > SERVER_CACHE_MAX) {
        const first = SERVER_CACHE.keys().next().value;
        if (first !== undefined) SERVER_CACHE.delete(first);
    }
    return data;
};

const DELIVERY_TYPES: Record<string, string[]> = {
    knittingOrder: ["Yarn Delivery", "Yarn Return", "Grey Received", "Grey Fabric Received", "Finish Received"],
    dyeingOrder: ["Grey Delivery", "Grey Return", "Grey Received", "Finish Received"],
    aopOrder: ["Sent For Aop", "Received From Aop", "AOP Finish Fabric Rcvd", "Return From Aop"],
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Classifies every delivery row (delivery / return / received / finish), resolves the party
// (work order factory, else To/From factory) and the signed balance amount.
// WorkOrder.factoryName defaults to the literal string 'NULL', so that value is treated as empty.
const baseCte = (orderType: string, types: string[]) => {
    const finishAmt = Prisma.raw(FINISH_IN_BALANCE ? "-qty" : "0");
    return Prisma.sql`
    WITH s0 AS (
        SELECT
            dl.id::text AS id,
            dl."challanNo" AS challan_no,
            (COALESCE(dl."deliveryDate", dl."createdAt"))::date AS day,
            COALESCE(dl."deliveryQty", 0)::float8 AS qty,
            regexp_replace(lower(dl."deliveryType"::text), '[[:space:]_-]+', '', 'g') AS t,
            dl."toFactory" AS to_factory,
            dl."fromFactory" AS from_factory,
            wo."factoryName" AS wo_factory,
            wo."jobNo" AS job_no,
            c."composition" AS composition,
            c."color" AS color
        FROM ${T.deliveries} dl
        JOIN ${T.composition} c ON c.id = dl.${COL.deliveryCompositionId}
        LEFT JOIN ${T.workOrder} wo ON wo.id = c.${COL.compositionWorkOrderId}
        WHERE c."orderType"::text = ${orderType}
          AND dl."deliveryType"::text = ANY(${types}::text[])
    ),
    s1 AS (
        SELECT s0.*,
            CASE
                WHEN t LIKE '%finish%' THEN 'finish'
                WHEN t LIKE '%sentfor%' OR (t LIKE '%delivery%' AND t NOT LIKE '%received%') THEN 'delivery'
                WHEN t LIKE '%return%' THEN 'return'
                ELSE 'received'
            END AS kind
        FROM s0
    ),
    base AS (
        SELECT s1.*,
            COALESCE(
                NULLIF(NULLIF(btrim(wo_factory), ''), 'NULL'),
                NULLIF(NULLIF(btrim(CASE WHEN kind = 'delivery' THEN to_factory ELSE from_factory END), ''), 'NULL'),
                'Unknown'
            ) AS party,
            CASE kind
                WHEN 'delivery' THEN qty
                WHEN 'return' THEN -qty
                WHEN 'received' THEN -qty
                ELSE ${finishAmt}
            END AS amt
        FROM s1
    ),
    keyed AS (
        SELECT base.*, lower(regexp_replace(btrim(party), '[[:space:]]+', ' ', 'g')) AS party_key
        FROM base
    )`;
};

const readParams = (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };
    const types = DELIVERY_TYPES[orderType];
    if (!types) {
        res.status(400).send({ msg: "Invalid order type", type: "error" });
        return null;
    }
    return { orderType, types };
};

const readQuarter = (req: Request, res: Response) => {
    const { start, next } = req.query as { start?: string; next?: string };
    if (!start || !next || !DATE_RE.test(start) || !DATE_RE.test(next)) {
        res.status(400).send({ msg: "start and next (YYYY-MM-DD) are required", type: "error" });
        return null;
    }
    return { start, next };
};

// GET /quarterly-balance/:orderType/months  ->  ["2026-09", "2026-08", ...]
export const quarterlyMonths = async (req: Request, res: Response) => {
    const p = readParams(req, res);
    if (!p) return;
    try {
        const data = await cached(req, `m|${p.orderType}`, async () => {
            const rows = await prisma.$queryRaw<{ m: string }[]>`
                SELECT DISTINCT to_char(COALESCE(dl."deliveryDate", dl."createdAt"), 'YYYY-MM') AS m
                FROM ${T.deliveries} dl
                JOIN ${T.composition} c ON c.id = dl.${COL.deliveryCompositionId}
                WHERE c."orderType"::text = ${p.orderType}
                  AND dl."deliveryType"::text = ANY(${p.types}::text[])
                ORDER BY m DESC`;
            return rows.map((r) => r.m).filter(Boolean);
        });
        return res.status(200).send({ type: "success", data });
    } catch (err) {
        console.error("quarterlyMonths failed:", err);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }
};

// GET /quarterly-balance/:orderType/summary?start=1900-01-01&next=2999-01-01
// One row per party: opening (all history before start), period totals, closing.
// start=1900-01-01 / next=2999-01-01 means "All Time".
export const quarterlySummary = async (req: Request, res: Response) => {
    const p = readParams(req, res);
    if (!p) return;
    const q = readQuarter(req, res);
    if (!q) return;
    try {
        const data = await cached(req, `s|${p.orderType}|${q.start}|${q.next}`, async () => {
            return prisma.$queryRaw<any[]>`
                ${baseCte(p.orderType, p.types)}
                SELECT
                    party_key AS key,
                    MIN(party) AS name,
                    COALESCE(SUM(CASE WHEN day < ${q.start}::date THEN amt ELSE 0 END), 0)::float8 AS opening,
                    COALESCE(SUM(CASE WHEN day >= ${q.start}::date AND kind = 'delivery' THEN qty ELSE 0 END), 0)::float8 AS delivery,
                    COALESCE(SUM(CASE WHEN day >= ${q.start}::date AND kind = 'return' THEN qty ELSE 0 END), 0)::float8 AS ret,
                    COALESCE(SUM(CASE WHEN day >= ${q.start}::date AND kind = 'received' THEN qty ELSE 0 END), 0)::float8 AS received,
                    COALESCE(SUM(CASE WHEN day >= ${q.start}::date AND kind = 'finish' THEN qty ELSE 0 END), 0)::float8 AS finish,
                    COUNT(DISTINCT CASE WHEN day >= ${q.start}::date THEN challan_no END)::int AS challans,
                    COALESCE(SUM(amt), 0)::float8 AS closing
                FROM keyed
                WHERE day < ${q.next}::date
                GROUP BY party_key
                HAVING COUNT(CASE WHEN day >= ${q.start}::date THEN 1 END) > 0
                    OR ABS(COALESCE(SUM(CASE WHEN day < ${q.start}::date THEN amt ELSE 0 END), 0)) >= 0.005
                ORDER BY MIN(party)`;
        });
        return res.status(200).send({ type: "success", data });
    } catch (err) {
        console.error("quarterlySummary failed:", err);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }
};

// GET /quarterly-balance/:orderType/detail?start=...&next=...&party=<partyKey optional>
// Challan rows of the period (one party, or all parties when `party` is omitted).
export const quarterlyDetail = async (req: Request, res: Response) => {
    const p = readParams(req, res);
    if (!p) return;
    const q = readQuarter(req, res);
    if (!q) return;
    const party = typeof req.query.party === "string" && req.query.party ? req.query.party.slice(0, 300) : null;
    try {
        const result = await cached(req, `d|${p.orderType}|${q.start}|${q.next}|${party ?? ""}`, async () => {
            const rows = await prisma.$queryRaw<any[]>`
                ${baseCte(p.orderType, p.types)}
                SELECT
                    id,
                    party_key AS "partyKey",
                    to_char(day, 'YYYY-MM-DD') AS day,
                    challan_no AS "challanNo",
                    job_no AS "jobNo",
                    composition,
                    color,
                    CASE WHEN kind = 'delivery' THEN qty ELSE 0 END AS delivery,
                    CASE WHEN kind = 'return' THEN qty ELSE 0 END AS ret,
                    CASE WHEN kind = 'received' THEN qty ELSE 0 END AS received,
                    CASE WHEN kind = 'finish' THEN qty ELSE 0 END AS finish,
                    amt AS delta
                FROM keyed
                WHERE day >= ${q.start}::date AND day < ${q.next}::date
                ${party ? Prisma.sql`AND party_key = ${party}` : Prisma.empty}
                ORDER BY party_key, day, challan_no, id::bigint
                LIMIT ${MAX_DETAIL_ROWS + 1}`;
            const truncated = rows.length > MAX_DETAIL_ROWS;
            return { data: truncated ? rows.slice(0, MAX_DETAIL_ROWS) : rows, truncated };
        });
        return res.status(200).send({ type: "success", ...result });
    } catch (err) {
        console.error("quarterlyDetail failed:", err);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }
};