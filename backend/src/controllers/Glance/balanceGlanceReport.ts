import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

interface DeliveryRow { deliveryQty: number; deliveryType: string; }
interface StyleRequirementRow {
    id: number | string;
    processLoss: number | null;
    finishRequiredQty: number | null;
    additional: number | null;
}
interface CompositionRow {
    workOrderQty: number;
    orderType: string;
    processLoss?: number | null; // process loss of the composition itself
    styleRequirementRow?: StyleRequirementRow | null;
    deliveries: DeliveryRow[];
}
interface WorkOrderRow { id: number; factoryName: string; jobNo: string; compositions: CompositionRow[]; }
type DeliveryTypeTotals = Record<string, number>;
interface FactoryRow {
    factoryName: string;
    workOrderQty: number;
    yarnReqQty: number;
    deliveryTypeTotals: DeliveryTypeTotals;
}
interface JobReportNode {
    jobNo: string;
    bookingQty: number; // = total Required Yarn Qty of the job's style requirement rows
    totalWorkOrderQty: number;
    totalYarnReqQty: number;
    deliveryTypeTotals: DeliveryTypeTotals;
    dyeingRows: FactoryRow[];
}
interface BalanceGlanceReport {
    deliveryTypes: string[];
    jobs: JobReportNode[];
    pagination: { page: number; limit: number; totalJobs: number | null; hasMore: boolean; search: string };
}

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const toNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// Required Yarn Qty of ONE style requirement row (same formula as the StyleRequirement component):
// (finishRequiredQty + additional) * (1 + processLoss / 100)
const styleRowYarnReq = (sr: StyleRequirementRow | null | undefined): number => {
    if (!sr) return 0;
    const finishReq = toNum(sr.finishRequiredQty);
    const additional = toNum(sr.additional);
    const loss = toNum(sr.processLoss);
    return (finishReq + additional) * (1 + loss / 100);
};

// Process loss (in %) of a composition: composition value first, style requirement row as fallback.
// If your composition field has another name, change ONLY this function.
const compositionLoss = (comp: CompositionRow): number => {
    if (comp.processLoss !== null && comp.processLoss !== undefined) return toNum(comp.processLoss);
    return toNum(comp.styleRequirementRow?.processLoss);
};

// Yarn required of ONE composition = (finishRequiredQty + additional) * (1 + processLoss / 100)
const compositionYarnReq = (comp: CompositionRow): number => {
    const sr = comp.styleRequirementRow;
    const finishReq = toNum(sr?.finishRequiredQty);
    const additional = toNum(sr?.additional);
    const loss = compositionLoss(comp);
    return (finishReq + additional) * (1 + loss / 100);
};

const addToTotals = (totals: DeliveryTypeTotals, type: string, qty: number, seenTypes: Set<string>): void => {
    const key = type?.trim() || "Unspecified";
    seenTypes.add(key);
    totals[key] = round2((totals[key] ?? 0) + qty);
};

function processWorkOrders(
    workOrders: WorkOrderRow[],
    jobMap: Map<string, JobReportNode>,
    factoryRowMap: Map<string, FactoryRow>,
    seenTypes: Set<string>,
    seenJobStyleRows: Set<string>
): void {
    for (const wo of workOrders) {
        let job = jobMap.get(wo.jobNo);
        if (!job) {
            job = {
                jobNo: wo.jobNo,
                bookingQty: 0,
                totalWorkOrderQty: 0,
                totalYarnReqQty: 0,
                deliveryTypeTotals: {},
                dyeingRows: [],
            };
            jobMap.set(wo.jobNo, job);
        }
        const rowKey = `${wo.jobNo}::${wo.factoryName}`;
        let factoryRow = factoryRowMap.get(rowKey);
        if (!factoryRow) {
            factoryRow = { factoryName: wo.factoryName, workOrderQty: 0, yarnReqQty: 0, deliveryTypeTotals: {} };
            factoryRowMap.set(rowKey, factoryRow);
            job.dyeingRows.push(factoryRow);
        }

        for (const comp of wo.compositions ?? []) {
            const woQty = toNum(comp.workOrderQty);
            factoryRow.workOrderQty = round2(factoryRow.workOrderQty + woQty);
            job.totalWorkOrderQty = round2(job.totalWorkOrderQty + woQty);

            // Yarn Req: calculated for EVERY composition, same as the frontend formula
            const sr = comp.styleRequirementRow;
            const req = sr ? compositionYarnReq(comp) : woQty; // no style row -> fall back to work order qty
            factoryRow.yarnReqQty = round2(factoryRow.yarnReqQty + req);
            job.totalYarnReqQty = round2(job.totalYarnReqQty + req);

            // Booking Qty: Required Yarn Qty of the job's style rows, each row counted once per job
            // (finishRequiredQty + additional) * (1 + processLoss / 100)
            if (sr) {
                const jobKey = `${wo.jobNo}::${sr.id}`;
                if (!seenJobStyleRows.has(jobKey)) {
                    seenJobStyleRows.add(jobKey);
                    job.bookingQty = round2(job.bookingQty + styleRowYarnReq(sr));
                }
            }

            for (const d of comp.deliveries ?? []) {
                addToTotals(factoryRow.deliveryTypeTotals, d.deliveryType, d.deliveryQty, seenTypes);
                addToTotals(job.deliveryTypeTotals, d.deliveryType, d.deliveryQty, seenTypes);
            }
        }
    }
}

export const balanceGlanceReport = async (req: Request, res: Response) => {
    const io = getIO();
    const requestId = (req.query?.requestId as string) || (req.body?.requestId as string) || "";

    const emitProgress = (percentage: number, message: string, error = false) => {
        if (io && requestId) {
            io.to(requestId).emit("reportProgress", { percentage, message, ...(error ? { error: true } : {}) });
        }
    };

    try {
        // 1. Query params
        const search = String(req.query.search ?? "").trim();
        const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
        const limit = Math.min(
            MAX_LIMIT,
            Math.max(1, parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
        );

        emitProgress(5, search ? `Searching "${search}"...` : "Finding jobs...");

        // 2. Filter runs in the database (job no OR factory name)
        // "mode: insensitive" works on PostgreSQL/MongoDB. On MySQL/SQL Server remove it.
        const where = {
            isCancelled: false,
            ...(search
                ? {
                      OR: [
                          { jobNo: { contains: search, mode: "insensitive" as const } },
                          { factoryName: { contains: search, mode: "insensitive" as const } },
                      ],
                  }
                : {}),
        };

        // 3. This page's job numbers (take limit + 1 to know if more pages exist)
        const [pageGroups, allGroups] = await Promise.all([
            prisma.workOrder.groupBy({
                by: ["jobNo"],
                where,
                orderBy: { _max: { id: "desc" } }, // newest jobs first
                skip: (page - 1) * limit,
                take: limit + 1,
            }),
            page === 1 ? prisma.workOrder.groupBy({ by: ["jobNo"], where }) : Promise.resolve(null),
        ]);

        const hasMore = pageGroups.length > limit;
        const pageJobNos = pageGroups.slice(0, limit).map((g) => g.jobNo);
        const totalJobs = allGroups ? allGroups.length : null;

        if (pageJobNos.length === 0) {
            emitProgress(100, "Complete");
            const empty: BalanceGlanceReport = {
                deliveryTypes: [],
                jobs: [],
                pagination: { page, limit, totalJobs: totalJobs ?? 0, hasMore: false, search },
            };
            return res.status(200).json(empty);
        }

        emitProgress(35, `Loading ${pageJobNos.length} jobs...`);

        // 4. Load ALL work orders of ONLY these jobs
        const workOrders = await prisma.workOrder.findMany({
            where: { isCancelled: false, jobNo: { in: pageJobNos } },
            select: {
                id: true, factoryName: true, jobNo: true,
                compositions: {
                    select: {
                        workOrderQty: true,
                        orderType: true,
                        styleRequirementRow: {
                            select: {
                                id: true,
                                processLoss: true,
                                finishRequiredQty: true,
                                additional: true,
                            },
                        },
                        deliveries: { select: { deliveryQty: true, deliveryType: true } },
                    },
                },
            },
        });

        emitProgress(75, "Calculating balances...");

        // 5. Aggregate
        const jobMap = new Map<string, JobReportNode>();
        const factoryRowMap = new Map<string, FactoryRow>();
        const seenTypes = new Set<string>();
        const seenJobStyleRows = new Set<string>();
        processWorkOrders(
            workOrders as unknown as WorkOrderRow[],
            jobMap,
            factoryRowMap,
            seenTypes,
            seenJobStyleRows
        );

        const jobs = pageJobNos
            .map((no) => jobMap.get(no))
            .filter((j): j is JobReportNode => !!j);

        const report: BalanceGlanceReport = {
            deliveryTypes: Array.from(seenTypes).sort((a, b) => a.localeCompare(b)),
            jobs,
            pagination: { page, limit, totalJobs, hasMore, search },
        };

        emitProgress(100, "Complete");
        return res.status(200).json(report);
    } catch (e) {
        console.error("❌ [Backend] Error in balanceGlanceReport:", e);
        emitProgress(100, "Error occurred", true);
        return res.status(500).json({ message: "Something went wrong" });
    }
};