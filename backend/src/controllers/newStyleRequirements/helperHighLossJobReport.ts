/**
 * Step 1: Convert the job's required finished qty into a required YARN qty,
 * by baking in the job's target processLoss% (the extra yarn you need to
 * procure to allow for expected loss):
 *
 *   totalFinishRequiredQty = sum(StyleRequirementRow.finishRequiredQty)
 *                            across every row under the job
 *   yarnRequiredQty        = totalFinishRequiredQty * (1 + processLoss / 100)
 *
 * Step 2: For each order type (aopOrder / knittingOrder / dyeingOrder /
 * etc. — kept SEPARATE, never summed together), compare its actual
 * workOrderQty against that same yarnRequiredQty baseline:
 *
 *   perType.totalWorkOrderQty = sum(composition.workOrderQty) across only
 *                               that order type's work orders
 *   perType.excessPct         = (perType.totalWorkOrderQty - yarnRequiredQty)
 *                                / yarnRequiredQty * 100
 *
 * Being UNDER yarnRequiredQty is always fine (negative excessPct never
 * flags, however large the gap — that just means less yarn was used than
 * expected). Being OVER it only matters once the excess is more than a
 * small tolerance (default 0.5%, i.e. a couple hundredths of a percent
 * over is noise; a few percent over is a real problem):
 *
 *   isFlagged = excessPct > margin   (default margin: 0.5)
 *
 * A job is flagged if ANY of its order types is flagged individually.
 */

const DEFAULT_MARGIN = 0;

export type WorkOrderTypeReport = {
    count: number;
    totalWorkOrderQty: number;
    excessPct: number | null;
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

const computeExcessPct = (
    yarnRequiredQty: number,
    workOrderQty: number
): number | null => {
    if (!yarnRequiredQty) return null;
    return ((workOrderQty - yarnRequiredQty) / yarnRequiredQty) * 100;
};

export const buildJobHistoryReport = (
    style: any,
    margin: number = DEFAULT_MARGIN
): JobLossHistoryReport => {
    const workOrders = style.workOrders ?? [];
    const rows = style.rows ?? [];

    const totalFinishRequiredQty = rows.reduce(
        (sum: number, row: any) => sum + (row.finishRequiredQty || 0),
        0
    );

    // Step 1: finishRequiredQty -> yarnRequiredQty, using the job's target processLoss
    const yarnRequiredQty =
        totalFinishRequiredQty * (1 + (style.processLoss || 0) / 100);

    // accumulate qty per order type WITHOUT mixing types together
    const rawTotalsByType: Record<string, { count: number; qty: number }> = {};
    const deliveryTotalsByType: Record<string, number> = {};
    let totalDeliveries = 0;

    for (const wo of workOrders) {
        const type = wo.orderType || "Unknown";
        if (!rawTotalsByType[type]) rawTotalsByType[type] = { count: 0, qty: 0 };
        rawTotalsByType[type].count++;

        for (const comp of wo.compositions ?? []) {
            rawTotalsByType[type].qty += comp.workOrderQty || 0;

            for (const d of comp.deliveries ?? []) {
                totalDeliveries++;
                const deliveryType = (d.deliveryType || "Unknown").replace(
                    /\s+/g,
                    ""
                );
                deliveryTotalsByType[deliveryType] =
                    (deliveryTotalsByType[deliveryType] || 0) +
                    (d.deliveryQty || 0);
            }
        }
    }

    // Step 2: compare each order type's actual workOrderQty against yarnRequiredQty
    const workOrderTotalsByType: Record<string, WorkOrderTypeReport> = {};
    const flaggedOrderTypes: string[] = [];

    for (const [type, raw] of Object.entries(rawTotalsByType)) {
        const excessPct = computeExcessPct(yarnRequiredQty, raw.qty);
        const isFlagged = excessPct !== null && excessPct > margin;

        if (isFlagged) flaggedOrderTypes.push(type);

        workOrderTotalsByType[type] = {
            count: raw.count,
            totalWorkOrderQty: raw.qty,
            excessPct,
            isFlagged,
        };
    }

    return {
        jobNo: style.jobNo,
        styleNo: style.styleNo,
        buyerName: style.buyerName,
        poNo: style.poNo,
        targetProcessLoss: style.processLoss,
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