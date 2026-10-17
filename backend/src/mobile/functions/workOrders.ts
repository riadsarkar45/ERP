import prisma from "../../database/prismaClient/prisma";

export const workOrders = async () => {
    const [jobs, pendingApprovalJobs] = await Promise.all([
        prisma.workOrder.count(),
        prisma.workOrder.count({
            where: { isApproved: false },
        }),
    ]);

    return {
        jobs,
        pendingApprovalJobs,
    };
};

export const completedJobs = async () => {
    return prisma.styleRequirement.count({
        where: { isReconciliationDone: true },
    });
};