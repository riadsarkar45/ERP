import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

// ---------- Types ----------

interface DeliveryRow {
    deliveryQty: number;
    deliveryType: string;
}

interface CompositionRow {
    workOrderQty: number;
    orderType: string;
    deliveries: DeliveryRow[];
}

interface WorkOrderRow {
    id: number;
    factoryName: string;
    jobNo: string;
    compositions: CompositionRow[];
}

type DeliveryTypeTotals = Record<string, number>;

interface FactoryRow {
    factoryName: string;
    workOrderQty: number;
    deliveryTypeTotals: DeliveryTypeTotals;
}

interface JobReportNode {
    jobNo: string;
    totalWorkOrderQty: number;
    deliveryTypeTotals: DeliveryTypeTotals;
    dyeingRows: FactoryRow[];
}

interface BalanceGlanceReport {
    deliveryTypes: string[];
    jobs: JobReportNode[];
}

// ---------- Helpers ----------

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const addToTotals = (
    totals: DeliveryTypeTotals,
    type: string,
    qty: number,
    seenTypes: Set<string>
): void => {
    const key = type?.trim() || "Unspecified";
    seenTypes.add(key);
    totals[key] = round2((totals[key] ?? 0) + qty);
};

/**
 * Builds a Job (unique) -> Factory (dyeingRows, unique per job) tree,
 * summing deliveryQty by deliveryType at both the job level and the
 * per-factory row level. Also returns the full set of delivery types
 * seen across all data, so the frontend can render columns dynamically
 * instead of hardcoding known type names.
 *
 * A job can legitimately be processed across multiple factories
 * (e.g. SM26-3462-DEC under both HOTAPARA-DYEING and BHUIYAN DYEING) —
 * each becomes its own row under that one job.
 */
function buildJobCentricReport(workOrders: WorkOrderRow[]): BalanceGlanceReport {
    const jobMap = new Map<string, JobReportNode>(); // key: jobNo
    const factoryRowMap = new Map<string, FactoryRow>(); // key: `${jobNo}::${factoryName}`
    const seenTypes = new Set<string>();

    for (const wo of workOrders) {
        let job = jobMap.get(wo.jobNo);
        if (!job) {
            job = {
                jobNo: wo.jobNo,
                totalWorkOrderQty: 0,
                deliveryTypeTotals: {},
                dyeingRows: [],
            };
            jobMap.set(wo.jobNo, job);
        }

        const rowKey = `${wo.jobNo}::${wo.factoryName}`;
        let factoryRow = factoryRowMap.get(rowKey);
        if (!factoryRow) {
            factoryRow = {
                factoryName: wo.factoryName,
                workOrderQty: 0,
                deliveryTypeTotals: {},
            };
            factoryRowMap.set(rowKey, factoryRow);
            job.dyeingRows.push(factoryRow);
        }

        for (const comp of wo.compositions ?? []) {
            factoryRow.workOrderQty = round2(factoryRow.workOrderQty + comp.workOrderQty);
            job.totalWorkOrderQty = round2(job.totalWorkOrderQty + comp.workOrderQty);

            for (const d of comp.deliveries ?? []) {
                addToTotals(factoryRow.deliveryTypeTotals, d.deliveryType, d.deliveryQty, seenTypes);
                addToTotals(job.deliveryTypeTotals, d.deliveryType, d.deliveryQty, seenTypes);
            }
        }
    }

    return {
        deliveryTypes: Array.from(seenTypes).sort((a, b) => a.localeCompare(b)),
        jobs: Array.from(jobMap.values()),
    };
}

// ---------- Controller ----------

export const balanceGlanceReport = async (req: Request, res: Response) => {
    try {
        const workOrders = await prisma.workOrder.findMany({
            // take: 600,
            select: {
                id: true,
                factoryName: true,
                jobNo: true,
                compositions: {
                    select: {
                        workOrderQty: true,
                        orderType: true,
                        deliveries: {
                            select: {
                                deliveryQty: true,
                                deliveryType: true,
                            },
                        },
                    },
                },
            },
        });

        const report = buildJobCentricReport(workOrders as WorkOrderRow[]);

        res.status(200).json(report);
    } catch (e) {
        console.error("Error in balanceGlanceReport:", e);
        res.status(500).json({ message: "Something went wrong" });
    }
};