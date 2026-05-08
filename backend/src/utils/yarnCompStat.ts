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
                Object.entries(c).forEach(([key, value]) => {
                    if (typeof value === "number") {
                        const summaryKey = `${type}_${key}`;
                        if (!summary[summaryKey]) summary[summaryKey] = 0;
                        summary[summaryKey] += value;
                    }
                });
            });
        });

        

        return {
            ...s,
            summary
        };
    });
};