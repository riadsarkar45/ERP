export const calculateYarnCompStat = (compositions: any[]) => {
    return compositions.map(comp => ({
        ...comp,
        compositions: comp.compositions.map((c: any) => {

            const yarnDeliveries = c.deliveries.filter(
                (delivery: any) => delivery.deliveryType === "Yarn Delivery" 
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

            return {
                ...c,
                totalYarnDelivery,
                totalYarnReturn,
            };
        })
    }));
};