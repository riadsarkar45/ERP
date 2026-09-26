import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const DEFAULT_MARGIN = 0.5;

export type WorkOrderTypeReport = {
    count: number;
    totalWorkOrderQty: number;
    excessPct: number;
    isFlagged: boolean;
};

export type JobLossHistoryReport = {
    jobNo: string;
    styleNo: string | null;
    buyerName: string | null;
    poNo: string | null;
    targetProcessLoss: number;
    isFlagged: boolean;
    flaggedOrderTypes: string[];
    totalWorkOrders: number;
    totalDeliveries: number;
    totalFinishRequiredQty: number;
    yarnRequiredQty: number;
    workOrderTotalsByType: Record<string, WorkOrderTypeReport>;
    deliveryTotalsByType: Record<string, number>;
};

/**
 * Computes the excess percentage of work order quantity vs required yarn quantity.
 * Returns Infinity if required is 0 but work order qty exists (guarantees flagging).
 */
const computeExcessPct = (yarnRequiredQty: number, workOrderQty: number): number => {
    if (yarnRequiredQty <= 0) {
        return workOrderQty > 0 ? Infinity : 0;
    }
    return ((workOrderQty - yarnRequiredQty) / yarnRequiredQty) * 100;
};

export const buildJobHistoryReport = (
    style: any,
    margin: number = DEFAULT_MARGIN
): JobLossHistoryReport => {
    const workOrders = style.workOrders ?? [];
    const rows = style.rows ?? [];

    // FIX: Use Number() to safely handle Prisma Decimal types or string representations
    // preventing accidental string concatenation (e.g., "0" + "10.5" = "010.5")
    const totalFinishRequiredQty = rows.reduce(
        (sum: number, row: any) => sum + Number(row.finishRequiredQty || 0),
        0
    );

    const processLoss = Number(style.processLoss || 0);
    
    // Step 1: finishRequiredQty -> yarnRequiredQty, using the job's target processLoss
    const yarnRequiredQty = totalFinishRequiredQty * (1 + processLoss / 100);

    const rawTotalsByType: Record<string, { count: number; qty: number }> = {};
    const deliveryTotalsByType: Record<string, number> = {};
    let totalDeliveries = 0;

    for (const wo of workOrders) {
        const type = wo.orderType || "Unknown";
        if (!rawTotalsByType[type]) {
            rawTotalsByType[type] = { count: 0, qty: 0 };
        }
        rawTotalsByType[type].count++;

        for (const comp of wo.compositions ?? []) {
            // FIX: Explicit Number casting for accurate math
            const woQty = Number(comp.workOrderQty || 0);
            rawTotalsByType[type].qty += woQty;

            for (const d of comp.deliveries ?? []) {
                totalDeliveries++;
                const deliveryType = (d.deliveryType || "Unknown").replace(/\s+/g, "");
                const dQty = Number(d.deliveryQty || 0);
                
                deliveryTotalsByType[deliveryType] =
                    (deliveryTotalsByType[deliveryType] || 0) + dQty;
            }
        }
    }

    // Step 2: compare each order type's actual workOrderQty against yarnRequiredQty
    const workOrderTotalsByType: Record<string, WorkOrderTypeReport> = {};
    const flaggedOrderTypes: string[] = [];

    for (const [type, raw] of Object.entries(rawTotalsByType)) {
        const excessPct = computeExcessPct(yarnRequiredQty, raw.qty);
        
        // Being UNDER yarnRequiredQty is always fine (negative excessPct never flags)
        // Being OVER it only matters once the excess is more than the margin
        const isFlagged = excessPct > margin;

        if (isFlagged) {
            flaggedOrderTypes.push(type);
        }

        workOrderTotalsByType[type] = {
            count: raw.count,
            totalWorkOrderQty: raw.qty,
            // Cap Infinity to 999999 to prevent JSON.stringify from converting it to null
            excessPct: excessPct === Infinity ? 999999 : Number(excessPct.toFixed(2)),
            isFlagged,
        };
    }

    return {
        jobNo: style.jobNo,
        styleNo: style.styleNo,
        buyerName: style.buyerName,
        poNo: style.poNo,
        targetProcessLoss: processLoss,
        isFlagged: flaggedOrderTypes.length > 0,
        flaggedOrderTypes,
        totalWorkOrders: workOrders.length,
        totalDeliveries,
        totalFinishRequiredQty,
        yarnRequiredQty,
        workOrderTotalsByType,
        deliveryTotalsByType,
    };
};

export const findHighLossJobReports = (
    styles: any[],
    margin: number = DEFAULT_MARGIN
): JobLossHistoryReport[] =>
    styles
        .map((s) => buildJobHistoryReport(s, margin))
        .filter((r) => r.isFlagged);

/**
 * GET /api/style-requirements/high-loss-jobs
 */
export const getHighLossJobs = async (req: Request, res: Response) => {
    try {
        const { jobNo, debug, margin: marginQuery } = req.query as {
            jobNo?: string;
            debug?: string;
            margin?: string;
        };
        
        // FIX: Properly parse margin, fallback to DEFAULT_MARGIN (0.5)
        const margin = marginQuery !== undefined ? Number(marginQuery) : DEFAULT_MARGIN;

        const styles = await prisma.styleRequirement.findMany({
            where: jobNo ? { jobNo } : {},
            select: {
                id: true,
                jobNo: true,
                styleNo: true,
                buyerName: true,
                poNo: true,
                processLoss: true,
                rows: {
                    select: {
                        id: true,
                        finishRequiredQty: true,
                    },
                },
                workOrders: {
                    select: {
                        id: true,
                        workOrderNo: true,
                        orderType: true,
                        compositions: {
                            select: {
                                id: true,
                                color: true,
                                composition: true,
                                workOrderQty: true,
                                deliveries: {
                                    select: {
                                        deliveryType: true,
                                        deliveryQty: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (debug === "true") {
            const debugData = styles.map((style) =>
                buildJobHistoryReport(style, margin)
            );

            console.log(`[high-loss-jobs debug] jobs fetched: ${styles.length}`);
            debugData.slice(0, 3).forEach((r) => {
                console.log(
                    `  jobNo=${r.jobNo} target=${r.targetProcessLoss}% totalFinishRequiredQty=${r.totalFinishRequiredQty} yarnRequiredQty=${r.yarnRequiredQty}`
                );
                Object.entries(r.workOrderTotalsByType).forEach(([type, t]) => {
                    console.log(
                        `    ${type}: workOrderQty=${t.totalWorkOrderQty} excessPct=${t.excessPct}% flagged=${t.isFlagged}`
                    );
                });
            });

            return res.status(200).json({
                type: "success",
                mode: "debug",
                jobCount: styles.length,
                flaggedCount: debugData.filter((r) => r.isFlagged).length,
                data: debugData,
            });
        }

        const reports = findHighLossJobReports(styles, margin);

        return res.status(200).json({
            type: "success",
            count: reports.length,
            data: reports,
        });
    } catch (error) {
        console.error("Error in getHighLossJobs:", error);
        return res.status(500).json({
            type: "error",
            message: "Internal server error",
        });
    }
};