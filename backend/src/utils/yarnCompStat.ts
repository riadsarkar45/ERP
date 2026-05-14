import prisma from "../database/prismaClient/prisma";

export const calculateYarnCompStat = (compositions: any[]) => {
    return compositions.map(comp => ({
        ...comp,
        compositions: comp.compositions.map((c: any) => {

            const yarnDeliveries = c.deliveries.filter(
                (delivery: any) => delivery.deliveryType === "Yarn Delivery"
            );

            const greyDeliveries = c.deliveries.filter(
                (delivery: any) => delivery.deliveryType === "Grey Received"
            );

            const yarnReturns = c.deliveries.filter(
                (delivery: any) => delivery.deliveryType === "Yarn Return"
            );

            const totalYarnDelivery = yarnDeliveries.reduce(
                (sum: number, delivery: any) => sum + delivery.deliveryQty, 0
            );

            const totalYarnReturn = yarnReturns.reduce(
                (sum: number, delivery: any) => sum + delivery.deliveryQty, 0
            );

            const greyReceived = greyDeliveries.reduce(
                (sum: number, delivery: any) => sum + delivery.deliveryQty, 0
            );

            return {
                ...c,
                totalYarnDelivery,
                totalYarnReturn,
                greyReceived
            };
        })
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