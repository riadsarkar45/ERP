import prisma from "../database/prismaClient/prisma";

export const calculateYarnCompStat = (orders: any[]) => {
    const sumByType = (deliveries: any[], type: string) =>
        deliveries
            .filter((d: any) => d.deliveryType === type)
            .reduce((sum: number, d: any) => sum + Number(d.deliveryQty || 0), 0);

    return orders
        .filter(order => Array.isArray(order.workOrders) && order.workOrders.length > 0)
        .map(order => ({
            ...order,

            workOrders: (order.workOrders || []).map((work: any) => ({
                ...work,

                compositions: (work.compositions || []).map((c: any) => {

                    // 1. FIND THE BOOKING COLOR: Match the composition and color from yarnDyeingJobs
                    const bookingColor = work.yarnDyeingJobs?.find(
                        (ydj: any) => ydj.composition === c.composition && ydj.color === c.color
                    )?.color || c.color;

                    const deliveries = c.deliveries || [];

                    const totalYarnDelivery = sumByType(deliveries, "Yarn Delivery");
                    const greyReceived = sumByType(deliveries, "Grey Received");
                    const totalGreyDelivery = sumByType(deliveries, "Grey Delivery");
                    const totalGreyReturnReceived = sumByType(deliveries, "Grey Return Received");
                    const totalGreyReceivedFromDyeing = sumByType(deliveries, "Grey Received From Dyeing");
                    const totalYarnReturn = sumByType(deliveries, "Yarn Return");
                    const totalFinishFabricReceived = sumByType(deliveries, "Finish Received");
                    const totalSentForCompacting = sumByType(deliveries, "Sent For Compacting");
                    const totalReceivedFromCompacting = sumByType(deliveries, "Received From Compacting");
                    const totalSentForAop = sumByType(deliveries, "Sent for AOP");
                    const totalReceivedForAop = sumByType(deliveries, "Received from AOP");
                    const totalYarnDeliveryYarnDye = sumByType(deliveries, "Yarn Delivery For Yarn Dye");

                    // 2. INJECT COLOR INTO DELIVERIES: Map over deliveries to add the booking color
                    const deliveriesWithColor2 = deliveries.map((d: any) => ({
                        ...d,
                        deliveryType: d.deliveryType,
                        color: bookingColor
                    }));

                    const YarnDeliveryWithColorDeliveryType: Record<string, number> = {};
                    deliveriesWithColor2.forEach((ele: any) => {
                        if (ele.color === bookingColor) {
                            const key = ele.deliveryType.replace(/\s+/g, "")
                            YarnDeliveryWithColorDeliveryType[key] =
                                (YarnDeliveryWithColorDeliveryType[key] || 0) + ele.deliveryQty;
                        }
                    });

                    return {
                        ...c,
                        yarnDeliveriesWithColor: YarnDeliveryWithColorDeliveryType,
                        totalYarnDelivery,
                        totalYarnReturn,
                        greyReceived,
                        totalGreyDelivery,
                        totalGreyReceivedFromDyeing,
                        totalGreyReturnReceived,
                        totalFinishFabricReceived,
                        totalSentForCompacting,
                        totalReceivedFromCompacting,
                        totalSentForAop,
                        totalReceivedForAop,
                        totalYarnDeliveryYarnDye
                    };
                })
            }))
        }));
};

export const calculateOrdersForStyleSummary = (styles: any[]) => {
    return styles.map((s: any) => {
        const workOrders = s.workOrders ?? [];
        const rows = s.rows ?? [];

        // Create an array that maps 1-to-1 with your table rows
        const compBreakdown = rows.map(() => ({}));

        // Build a lookup once per style instead of scanning `rows` with
        // findIndex for every composition (O(rows + compositions) instead
        // of O(rows * compositions)). Also removes the risk of a silent
        // whitespace/case mismatch going unnoticed — see the .trim() below.
        const rowIndexByKey = new Map<string, number>();
        rows.forEach((row: any, index: number) => {
            const key = `${String(row.color).trim()}|${String(row.composition).trim()}`;
            rowIndexByKey.set(key, index);
        });

        workOrders.forEach((w: any) => {
            // NOTE: an empty/missing orderType here means a workOrder record
            // was created without one set — that's a data issue upstream,
            // not something to silently patch here. Flagging it loudly so
            // it's easy to find and fix at the source instead of discovering
            // it as a mystery "Unknown_workOrderQty" column in the report.
            if (!w.orderType) {
                console.warn(
                    `[calculateOrdersForStyleSummary] styleReq id=${s.id} (${s.styleNo}) has a workOrder with no orderType set.`
                );
            }
            const orderType = w.orderType || "Unknown";

            w.compositions?.forEach((c: any) => {
                const key = `${String(c.color).trim()}|${String(c.composition).trim()}`;
                const matchingRowIndex = rowIndexByKey.get(key);

                if (matchingRowIndex === undefined) {
                    // Previously this failed silently (`return` with no trace),
                    // meaning a composition's quantity could vanish from the
                    // report with zero indication anything went wrong.
                    console.warn(
                        `[calculateOrdersForStyleSummary] styleReq id=${s.id} (${s.styleNo}): ` +
                        `no matching row for color="${c.color}" composition="${c.composition}" — this composition's quantities were dropped from the report.`
                    );
                    return;
                }

                const breakdown = compBreakdown[matchingRowIndex];

                // ── Work Order Qty ──
                if (typeof c.workOrderQty === "number") {
                    const wqKey = `${orderType}_workOrderQty`;
                    breakdown[wqKey] = (breakdown[wqKey] ?? 0) + c.workOrderQty;
                }

                // ── Deliveries ──
                const deliveries = c.deliveries ?? [];
                deliveries.forEach((d: any) => {
                    const safeDeliveryType = String(d.deliveryType ?? "Unknown").replace(/\s+/g, "_");
                    const deliveryKey = `${orderType}_${safeDeliveryType}`;
                    breakdown[deliveryKey] = (breakdown[deliveryKey] ?? 0) + (d.deliveryQty || 0);
                });
            });
        });

        // Return the style WITHOUT the raw workOrders tree — compBreakdown
        // is derived entirely from it, so shipping both duplicates the
        // nested compositions/deliveries data over the wire for no benefit.
        // If some other part of the frontend needs raw delivery-level detail
        // (e.g. an edit panel), fetch that on-demand per row instead of
        // eagerly including it here for every style on every page load.
        const { workOrders: _workOrders, ...rest } = s;
        return { ...rest, compBreakdown };
    });
};

export const findDeliveryDetail = async (id: number) => {

    if (!id) return null;

    // This function should ideally query the database to find the delivery detail by ID.
    const detail = await prisma.$queryRaw`SELECT * FROM composition WHERE id=${id}`;

    if (!detail) return null;

    return detail;
}



/**
 * Returns a breakdown of total delivered qty per deliveryType, per style,
 * per row. deliveryType is treated as fully dynamic — whatever strings
 * exist in the data become the keys, nothing is hardcoded.
 *
 * Output shape per style:
 *   {
 *     id, styleNo, ... (other style fields),
 *     deliveryBreakdown: [
 *       { rowId, color, composition, byDeliveryType: { "Yarn Delivery": 450, "Dyeing Delivery": 120 } },
 *       ...
 *     ]
 *   }
 */
/**
 * Sums deliveryQty grouped by deliveryType, across ALL workOrders and
 * compositions for a style — no row/color matching involved at all.
 *
 * Output per style:
 *   { id, styleNo, ... other style fields, deliveryTotals: { "Yarn Delivery": 450, "Dyeing Delivery": 120 } }
 */
export const getDeliveryBreakdownByType = (styles: any[]) => {
    return styles.map((s: any) => {
        const workOrders = s.workOrders ?? [];
        const deliveryTotals: Record<string, number> = {};

        workOrders.forEach((w: any) => {
            w.compositions?.forEach((c: any) => {
                (c.deliveries ?? []).forEach((d: any) => {
                    const type = d.deliveryType?.trim().replace(/\s+/g, "") || "Unknown";
                    deliveryTotals[type] = (deliveryTotals[type] ?? 0) + (d.deliveryQty || 0);
                });
            });
        });

        return { ...s, deliveryTotals };
    });
};

/**
 * Collects every distinct factoryName across all workOrders in all styles.
 */
export const getUniqueFactoryNames = (styles: any[]): string[] => {
    const names = new Set<string>();

    styles.forEach((s: any) => {
        (s.workOrders ?? []).forEach((w: any) => {
            const name = w.factoryName?.trim() || "Unknown";
            names.add(name);
        });
    });

    return Array.from(names);
};