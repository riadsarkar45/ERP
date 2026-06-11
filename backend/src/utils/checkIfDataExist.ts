import prisma from "../database/prismaClient/prisma";

export const checkDataExist = async (jobNo: string) => {
    if (!jobNo || jobNo === undefined || typeof jobNo !== "string") return;

    let jobId = null;


    const findData = await prisma.jobs.findUnique(
        {
            where: { jobNo: jobNo },
        },

    )

    jobId = findData ? findData.id : null;

    let isExist = false;

    if (!findData) {
        const createNewJob = await prisma.jobs.create(
            {
                data: {
                    jobNo: jobNo,
                },
                select: {
                    id: true,
                }
            }
        )
        jobId = createNewJob ? createNewJob.id : null;
        isExist = createNewJob ? true : false;
    }

    if (jobId !== null && isExist !== false) {
        return { id: jobId, created: true }
    }

    return { id: jobId, isExist: false }
}