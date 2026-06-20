import { de } from "zod/v4/locales";
import prisma from "../database/prismaClient/prisma";
import { any } from "zod";

export const calculateYarnCompStat = (orders: any[]) => {
    const sumByType = (deliveries: any[], type: string) =>
        deliveries
            .filter((d: any) => d.deliveryType === type)
            .reduce((sum: number, d: any) => sum + Number(d.deliveryQty || 0), 0);

    return orders.map(order => ({
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
                const totalFinishFabricReceived = sumByType(deliveries, "Finish Fabric Received");
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

                // console.log(YarnDeliveryWithColorDeliveryType, "test purpose");

                return {
                    ...c,
                    yarnDeliveriesWithColor: YarnDeliveryWithColorDeliveryType, // <-- Return the updated deliveries array
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
        const summary: Record<string, number> = {};

        workOrders.forEach((w: any) => {
            const type = w.orderType || "Unknown";

            w.compositions?.forEach((c: any, compIndex: number) => {
                // 1. Determine the composition identifier
                // If your composition object has a 'composition' or 'name' field, use it.
                // Otherwise, we fallback to the index to ensure unique keys.
                const compName = c.composition || c.name || `Composition_${compIndex}`;
                const safeCompName = compName.replace(/\s+/g, "_");

                // ── Work Order Qty ──
                if (typeof c.workOrderQty === "number") {
                    const summaryKey = `${type}_${safeCompName}_workOrderQty`;
                    summary[summaryKey] = (summary[summaryKey] ?? 0) + c.workOrderQty;
                }

                // ── Deliveries ──
                const deliveries = c.deliveries ?? [];
                deliveries.forEach((d: any) => {
                    const deliveryKey = `${type}_${safeCompName}_${d.deliveryType.replace(/\s+/g, "_")}`;
                    summary[deliveryKey] = (summary[deliveryKey] ?? 0) + (d.deliveryQty || 0);
                });
            });
        });

        return { ...s, summary };
    });
};

export const findDeliveryDetail = async (id: number) => {

    if (!id) return null;

    // This function should ideally query the database to find the delivery detail by ID.
    const detail = await prisma.$queryRaw`SELECT * FROM composition WHERE id=${id}`;

    if (!detail) return null;

    return detail;
}