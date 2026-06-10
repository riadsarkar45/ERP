import prisma from "../database/prismaClient/prisma";

export const checkDataExist = async (jobNo: string) => {
    if (!jobNo || typeof jobNo !== "string") {
        throw new Error("Job number must be a non-empty string");
    }

    try {
        const findData = await prisma.jobs.findUnique({
            where: { jobNo },
            select: { id: true }
        });

        if (findData) {
            return { id: findData.id, created: false };
        }

        const createNewJob = await prisma.jobs.create({
            data: { jobNo },
            select: { id: true }
        });

        return { id: createNewJob.id, created: true };
    } catch (error) {
        console.error("CheckDataExist error:", error);
        throw error;
    }
};