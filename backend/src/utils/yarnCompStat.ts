import prisma from "../database/prismaClient/prisma";

export const calculateYarnCompStat = (orders: any[]) => {
    return orders.map(order => ({
        ...order,

        workOrders: (order.workOrders || []).map((work: any) => ({
            ...work,

            compositions: (work.compositions || []).map((c: any) => {

                const deliveries = c.deliveries || [];

                const yarnDeliveries = deliveries.filter(
                    (d: any) => d.deliveryType === "Yarn Delivery"
                );

                const greyDeliveries = deliveries.filter(
                    (d: any) => d.deliveryType === "Grey Received"
                );

                const greyDelivery = deliveries.filter(
                    (d: any) => d.deliveryType === "Grey Delivery"
                )

                const greyReturnReceived = deliveries.filter(
                    (d: any) => d.deliveryType === "Grey Return Received"
                )

                const greyReceivedFromDyeing = deliveries.filter(
                    (d: any) => d.deliveryType === "Grey Received From Dyeing"
                )

                const yarnReturns = deliveries.filter(
                    (d: any) => d.deliveryType === "Yarn Return"
                );

                const finishFabricReceived = deliveries.filter(
                    (d: any) => d.deliveryType === "Finish Fabric Received"
                );

                const sentForCompacting = deliveries.filter(
                    (d: any) => d.deliveryType === "Sent For Compacting"
                );

                const receivedFromCompacting = deliveries.filter(
                    (d: any) => d.deliveryType === "Received From Compacting"
                );

                const totalReceivedFromCompacting = receivedFromCompacting.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );
                const totalSentForCompacting = sentForCompacting.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );


                const totalGreyReceivedFromDyeing = greyReceivedFromDyeing.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );


                const totalFinishFabricReceived = finishFabricReceived.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );

                const totalYarnDelivery = yarnDeliveries.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );

                const totalGreyReturnReceived = greyReturnReceived.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );
                const totalGreyDelivery = greyDelivery.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );

                const totalYarnReturn = yarnReturns.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );

                const greyReceived = greyDeliveries.reduce(
                    (sum: number, d: any) =>
                        sum + Number(d.deliveryQty || 0),
                    0
                );

                return {
                    ...c,
                    totalYarnDelivery,
                    totalYarnReturn,
                    greyReceived,
                    totalGreyDelivery,
                    totalGreyReceivedFromDyeing,
                    totalGreyReturnReceived,
                    totalFinishFabricReceived,
                    totalSentForCompacting,
                    totalReceivedFromCompacting
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

            w.compositions?.forEach((c: any) => {

                // ── Work Order Qty ──
                if (typeof c.workOrderQty === "number") {
                    const summaryKey = `${type}_workOrderQty`;
                    summary[summaryKey] = (summary[summaryKey] ?? 0) + c.workOrderQty;
                }

                // ── Deliveries ──
                const deliveries = c.deliveries ?? [];

                deliveries.forEach((d: any) => {
                    const deliveryKey = `${type}_${d.deliveryType.replace(/\s+/g, "_")}`;
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