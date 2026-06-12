import prisma from "../../database/prismaClient/prisma";

export const jobsByType = (jobs: any) => {
    if (!jobs || jobs.length === 0) {
        return {};
    }

    const jobCountByType: { [type: string]: { [date: string]: number } } = {};

    jobs.forEach((job: any) => {
        const orderType = job.orderType;
        const date = new Date(job.workOrderPlaceDate);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; // "2025-01"

        if (!jobCountByType[orderType]) {
            jobCountByType[orderType] = {};
        }

        jobCountByType[orderType][dateKey] = (jobCountByType[orderType][dateKey] ?? 0) + 1;
    });

    return jobCountByType;
};

export const jobsByDate = async (jobs: any,) => {
    const date = new Date().toISOString().split("T")[0]; // "2025-01-01"
    if (!jobs || jobs.length === 0 || !date) {
        return {};
    }

    const job = await prisma.workOrder.findMany(
        {
            where: { workOrderPlaceDate: date },
            select: {
                workOrderPlaceDate: true,
                compositions: {
                    select: {
                        workOrderQty: true,
                    }
                },
                orderType: true,
            }
        },

    )

    if(job.length === 0) {
        return {};
    }
    const jobsDate: { [type: string]: number } = {};

    jobs.forEach((job: any) => {
        const jobDate = job.workOrderPlaceDate

        if (!jobsDate[jobDate]) {
            jobsDate[jobDate] = 0;  
        }

        jobsDate[jobDate] += job.compositions.reduce(
            (sum: number, comp: any) => sum + (comp.workOrderQty ?? 0), 0
        );
    });
    return jobsDate;

}