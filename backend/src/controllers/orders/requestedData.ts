import prisma from "../../database/prismaClient/prisma"
import type { Request, Response } from "express";

export const requestedData = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const requestedData = await prisma.workOrderApprovalRequest.findMany(
        {
            where: { requestTo: Number(userId) },
            select: {
                requestType: true,
                byUser: {
                    select: {
                        name: true,
                    }
                },
                requestAt: true,
                workOrder: {
                    select: {
                        id: true,
                        jobNo: true,
                        factoryName: true,
                        lotNo: true,
                        machineDia: true,
                        stichLength: true,
                        yarnCount: true,
                        compositions: {
                            select: {
                                composition: true,
                                unitePrice: true,
                                color: true,
                                workOrderQty: true,
                            }
                        }
                    }
                }
            }
        },
    )

    res.send(requestedData)
}