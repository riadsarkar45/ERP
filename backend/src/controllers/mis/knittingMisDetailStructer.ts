type Composition = {
    workOrderQty: number;
};

type KnittingWorkOrder = {
    workOrderNo: string;
    factoryName: string;
    compositions: Composition[];
};

type FactorySummary = {
    factoryName: string;
    totalQty: number;
};

export const structureKnittingWorkOrder = (data: KnittingWorkOrder[]): FactorySummary[] => {
    const factoryTotals = new Map<string, number>();

    for (const workOrder of data) {
        const workOrderQtySum = workOrder.compositions.reduce(
            (sum, comp) => sum + comp.workOrderQty,
            0
        );

        const currentTotal = factoryTotals.get(workOrder.factoryName) ?? 0;
        factoryTotals.set(workOrder.factoryName, currentTotal + workOrderQtySum);
    }

    return Array.from(factoryTotals, ([factoryName, totalQty]) => ({
        factoryName,
        totalQty,
    }));
};