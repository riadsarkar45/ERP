export const jobsByType = (jobs: any) => {
    if (!jobs || jobs.length === 0) {
        return {};
    }
    const jobCountByType: { [key: string]: number } = {};

    jobs.forEach((job: any) => {
        const orderType = job.orderType;
        if (jobCountByType[orderType]) {
            jobCountByType[orderType]++;
        } else {
            jobCountByType[orderType] = 1;
        }
    });

    return jobCountByType;
};