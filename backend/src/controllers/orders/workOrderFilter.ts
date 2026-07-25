// utils/workOrderFilters.ts
import type { Prisma } from "@prisma/client";

// Maps a frontend column key (col.inputName) to where it actually lives in the schema.
// Extend this as you add more filterable columns per orderType.
type FilterLevel = "job" | "workOrder" | "styleRequirement" | "composition" | "yarnDyeingJob";

const FIELD_MAP: Record<string, FilterLevel> = {
    jobNo: "job",
    factoryName: "workOrder",
    workOrderNo: "workOrder",
    styleNo: "workOrder",
    month: "workOrder",
    buyerName: "styleRequirement",
    composition: "composition",
    color: "composition",
    orderQty: "composition",
    workOrderQty: "composition",
    unitePrice: "composition",
    bookingColor: "yarnDyeingJob",
};

export const buildWorkOrderWhere = (
    orderType: string,
    filters: Record<string, string[]>
): Prisma.WorkOrderWhereInput => {
    const where: Prisma.WorkOrderWhereInput = { orderType };
    const compositionFilters: Prisma.CompositionWhereInput = {};
    const yarnDyeingFilters: Prisma.YarnDyeingJobWhereInput = {};
    let styleRequirementFilters: Prisma.StyleRequirementWhereInput = {};

    for (const [key, values] of Object.entries(filters)) {
        if (!values?.length) continue;
        const level = FIELD_MAP[key];
        if (!level) continue; // unknown column, ignore rather than throw

        switch (level) {
            case "workOrder":
                (where as any)[key] = { in: values };
                break;
            case "styleRequirement":
                styleRequirementFilters = { ...styleRequirementFilters, [key]: { in: values } };
                break;
            case "composition":
                (compositionFilters as any)[key] = { in: values };
                break;
            case "yarnDyeingJob":
                (yarnDyeingFilters as any)[key] = { in: values };
                break;
            // "job" level handled separately in getAllOrders since it's outside workOrders
        }
    }

    if (Object.keys(styleRequirementFilters).length) {
        where.styleRequirement = { is: styleRequirementFilters };
    }
    if (Object.keys(compositionFilters).length) {
        where.compositions = { some: compositionFilters };
    }
    if (Object.keys(yarnDyeingFilters).length) {
        where.yarnDyeingJobs = { some: yarnDyeingFilters };
    }

    return where;
};

export const buildJobWhere = (filters: Record<string, string[]>): Prisma.JobsWhereInput => {
    const jobNo = filters.jobNo;
    return jobNo?.length ? { jobNo: { in: jobNo } } : {};
};