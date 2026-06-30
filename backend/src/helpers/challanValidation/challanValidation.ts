import prisma from "../../database/prismaClient/prisma"

export const challanValidation = async (challanNo: number) => {
    if (!challanNo) {
        return
    }

    const checkChallanNoIfExist = await prisma.deliveries.findMany(
        {
            where: { challanNo: Number(challanNo) },
            include:{composition:{
                select:{
                    composition: true
                }
            }}
        },
    )

    if (checkChallanNoIfExist.length > 0) {
        return checkChallanNoIfExist
    } else {
        return [];
    }
}