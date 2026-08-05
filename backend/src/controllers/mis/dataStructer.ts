interface Delivery {
    deliveryQty: number;
    deliveryType: string;
}

interface Composition {
    workOrderQty: number;
    deliveries: Delivery[];
}

interface WorkOrder {
    compositions: Composition[];
}

interface JobData {
    jobNo: string;
    workOrders: WorkOrder[];
}

interface JobSummary {
    jobNo: string;
    totalWorkOrderQty: number;
    deliveryTypeTotals: Record<string, number>;
}

const formatDeliveryType = (type: string) => type.trim().replace(/\s+/g, "");

export const managementViewData = (managementData: JobData[]): JobSummary[] => {
    return managementData
        .filter((job) => job.workOrders && job.workOrders.length > 0)
        .map((job) => {
            let totalWorkOrderQty = 0;
            const deliveryTypeTotals: Record<string, number> = {};

            job.workOrders.forEach((workOrder) => {
                workOrder.compositions.forEach((composition) => {
                    totalWorkOrderQty += composition.workOrderQty || 0;

                    composition.deliveries.forEach((delivery) => {
                        const key = formatDeliveryType(delivery.deliveryType);
                        deliveryTypeTotals[key] =
                            (deliveryTypeTotals[key] || 0) + (delivery.deliveryQty || 0);
                    });
                });
            });

            return {
                jobNo: job.jobNo,
                totalWorkOrderQty,
                deliveryTypeTotals,
            };
        });
};