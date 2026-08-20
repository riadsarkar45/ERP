import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const yarnStock = async (req: Request, res: Response) => {
    const yarnStock = await prisma.yarnStock.findMany(
        {
            select: {
                supplierName: true,
                composition: true,
                lotNo: true,
                id: true,
                physicalBalanceQty: true,
            }
        }
    )

    if (!yarnStock) {
        return res.status(404).send({ message: "No data found", type: "error" })
    }

    res.send(yarnStock)
}

export const ydStock = async (req: Request, res: Response) => {
    const ydStocks = await prisma.ydStock.findMany(
        {
            select: {
                buyer: true,
                color: true,
                composition: true,
                count: true,
                dyedYarnLot: true,
                id: true,
                jobNo: true,
                styleNo: true,
                yarnDyedStock: true,
            }
        }
    )

    if (!ydStocks) {
        return res.status(404).send({ message: "No data found", type: "error" })
    }

    res.send(ydStocks)
}