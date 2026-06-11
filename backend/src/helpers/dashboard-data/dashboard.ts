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