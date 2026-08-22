import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const yarnStock = async (req: Request, res: Response) => {
    try {
        const {
            workOrderQty,
            lotNo,
            yarnCount
        } = req.query;

        console.log(req.query);

        const workOrderToNumber = Number(workOrderQty);

        const where: any = {
            physicalBalanceQty: {
                gt: workOrderToNumber
            }
        };

        if (lotNo) {
            where.lotNo = String(lotNo);
        }

        if (yarnCount) {
            where.count = String(yarnCount);
        }

        const yarnStock = await prisma.yarnStock.findMany({
            where,

            orderBy: {
                physicalBalanceQty: "desc"
            },

            select: {
                supplierName: true,
                composition: true,
                lotNo: true,
                id: true,
                physicalBalanceQty: true,
                count: true,
            }
        });

        if (yarnStock.length === 0) {
            return res.status(404).send({
                message: "No data found",
                type: "error"
            });
        }

        return res.send(yarnStock);

    } catch (error) {
        console.error(error);

        return res.status(500).send({
            message: "Something went wrong",
            type: "error"
        });
    }
};
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