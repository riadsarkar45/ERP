import type { Request, Response } from 'express';
import prisma from '../../database/prismaClient/prisma';

export const departmentWiseProduction = async (req: Request, res: Response) => {
    const { dept } = req.params as { dept: string }
    const prodData = await prisma.productionData.findMany(
        {
            where: { department: dept },
            select: {
                productionDate: true,
                productionQty: true,
                jobNumber: true,
                createdAt: true,
                productionType: true,
                user: {
                    select: {
                        name: true,
                    }
                },
                remarks: true,
                styleRowId: {
                    select: {
                        color: true,
                        id: true,
                        styleRequirement: {
                            select: {
                                styleNo: true,
                            }
                        }
                    }
                }
            }
        }
    )

    res.status(200).send({ data: prodData, type: "success" })

}