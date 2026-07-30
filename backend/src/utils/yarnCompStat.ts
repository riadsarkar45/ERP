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

                    const deliveriesWithColor2 = deliveries.map((d: any) => ({
                        ...d,
                        deliveryType: d.deliveryType,
                        color: bookingColor
                    }));

                    const YarnDeliveryWithColorDeliveryType: Record<string, number> = {};
                    deliveriesWithColor2.forEach((ele: any) => {
                        if (ele.color === bookingColor) {
                            const key = ele.deliveryType.replace(/\s+/g, "");
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



// export const glanceReportManagement = (styles: any[]) => {
//     return styles.map((s: any) => {
//         const workOrders = s.workOrders ?? [];
//         const deliveryTotals: Record<string, number> = {};

//         workOrders.forEach((w: any) => {
//             w.compositions?.forEach((c: any) => {
//                 (c.deliveries ?? []).forEach((d: any) => {
//                     const type = d.deliveryType?.trim().replace(/\s+/g, "") || "Unknown";
//                     deliveryTotals[type] = (deliveryTotals[type] ?? 0) + (d.deliveryQty || 0);
//                 });
//             });
//         });

//         return { ...s, deliveryTotals };
//     });
// };

export const getJobWiseGlanceTotals = (styles: any[]) => {
    return styles.map((s: any) => {
        let totalWorkOrderQty = 0;
        let totalPayableAmount = 0;
        const deliveryTotals: Record<string, number> = {};
        let factoryName = "Unknown";

        const workOrders = s.workOrders ?? [];
        if (workOrders.length > 0) {
            factoryName = workOrders[0].factoryName || "Unknown";
        }

        workOrders.forEach((w: any) => {
            const compositions = w.compositions ?? [];
            
            compositions.forEach((c: any) => {
                const qty = Number(c.workOrderQty) || 0;
                const price = Number(c.unitePrice) || 0;
                
                // 1. Calculate Job-level Qty and Payable Amount
                totalWorkOrderQty += qty;
                totalPayableAmount += qty * price;

                // 2. Aggregate Deliveries for this job
                const deliveries = c.deliveries ?? [];
                deliveries.forEach((d: any) => {
                    const type = (d.deliveryType || "").trim().replace(/\s+/g, "") || "Unknown";
                    const dQty = Number(d.deliveryQty) || 0;
                    deliveryTotals[type] = (deliveryTotals[type] ?? 0) + dQty;
                });
            });
        });

        // Calculate weighted average unit price for display purposes
        const averageUnitPrice = totalWorkOrderQty > 0 ? (totalPayableAmount / totalWorkOrderQty) : 0;

        return {
            jobNo: s.jobNo,
            id: s.id,
            factoryName,
            totalWorkOrderQty,
            averageUnitPrice,
            totalPayableAmount,
            deliveryTotals,
        };
    });
};

export const getDeliveryBreakdownByType = (styles: any[]) => {
    return styles.map((s: any) => {
        const workOrders = s.workOrders ?? [];
        const deliveryTotals: Record<string, number[]> = {};

        workOrders.forEach((w: any) => {
            w.compositions?.forEach((c: any) => {
                (c.deliveries ?? []).forEach((d: any) => {
                    // Robust normalization: trim and remove ALL whitespace
                    const rawType = d.deliveryType || "";
                    const type = rawType.trim().replace(/\s+/g, "") || "Unknown";

                    if (!deliveryTotals[type]) {
                        deliveryTotals[type] = [];
                    }
                    deliveryTotals[type].push(Number(d.deliveryQty) || 0);
                });
            });
        });

        return { ...s, deliveryTotals };
    });
};

// NEW: A dedicated helper to safely sum deliveries for a SPECIFIC composition
export const getDeliverySum = (deliveries: any[], targetType: string): number => {
    if (!Array.isArray(deliveries)) return 0;
    const normalizedTarget = (targetType || "").trim().replace(/\s+/g, "");
    
    return deliveries.reduce((acc, d) => {
        const normalizedType = (d.deliveryType || "").trim().replace(/\s+/g, "");
        if (normalizedType === normalizedTarget) {
            return acc + (Number(d.deliveryQty) || 0);
        }
        return acc;
    }, 0);
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