import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const movementChallans = async (req: Request, res: Response) => {
    
    const movements = await prisma.spinningYarnMovement.findMany(
        {
            select: {
                challanNo: true,
                movementQty: true,
                movementType: true,
                movementDate: true,
                createdAt: true,
                yarnPoItems: {
                    select: {
                        id: true,
                        yarnCount: true,
                        composition: true,
                        yarnPo:{
                            select:{
                                lcNo: true,
                                piNo: true,
                                supplierName: true,
                            }
                        }
                    }
                }
            }
        }
    )

    return res.status(200).json({ message: "Yarn movement challans fetched successfully", type: "success", data: movements });

}