import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { buildJobHistoryReport, findHighLossJobReports } from "./helperHighLossJobReport";

/**
 * GET /api/style-requirements/high-loss-jobs
 * Optional query:
 *   ?jobNo=<jobNo>   scope to a single job
 *   ?margin=<number> tolerance % over yarnRequiredQty before flagging
 *                    (default 0.5). Being UNDER yarnRequiredQty never
 *                    flags, no matter how large the gap.
 *   ?debug=true      return EVERY job's computed report, flagged or not,
 *                    so you can sanity-check the numbers
 *
 * Step 1: yarnRequiredQty = totalFinishRequiredQty (from StyleRequirementRow,
 * summed across the job's rows) * (1 + StyleRequirement.processLoss / 100).
 *
 * Step 2: Order types (aopOrder / knittingOrder / dyeingOrder / etc.) are
 * kept SEPARATE. Each type's excessPct = (that type's totalWorkOrderQty -
 * yarnRequiredQty) / yarnRequiredQty * 100. A job is flagged if ANY single
 * order type's excessPct exceeds the margin (default 0.5%) on its own.
 *
 * Report includes total deliveries, total work orders, and totals
 * (with per-type excessPct/isFlagged) per order type, plus delivery
 * totals per delivery type (spaces stripped from delivery type keys).
 */
export const getHighLossJobs = async (req: Request, res: Response) => {
    try {
        const { jobNo, debug } = req.query as {
            jobNo?: string;
            debug?: string;
        };
        const margin = req.query.margin
            ? Number(req.query.margin)
            : undefined;

        const styles = await prisma.styleRequirement.findMany({
            where: jobNo ? { jobNo } : {},
            // take: 15,
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
                    `  jobNo=${r.jobNo} target=${r.targetProcessLoss} totalFinishRequiredQty=${r.totalFinishRequiredQty} yarnRequiredQty=${r.yarnRequiredQty}`
                );
                Object.entries(r.workOrderTotalsByType).forEach(([type, t]) => {
                    console.log(
                        `    ${type}: workOrderQty=${t.totalWorkOrderQty} excessPct=${t.excessPct} flagged=${t.isFlagged}`
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
        console.error(error);
        return res.status(500).json({
            type: "error",
            message: "Internal server error",
        });
    }
};