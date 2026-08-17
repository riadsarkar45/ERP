import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
interface FactoryTotal {
    factoryName: string;
    workOrderQty: number;
}

interface Composition {
    workOrderQty: number;
    id: number;
}

interface FactoryData {
    jobNo: string;
    id: number;
    factoryName: string;
    compositions: Composition[];
}
export const factoriesWithTotalWorkOrderQty = async (req: Request, res: Response) => {
    const { jobNo, orderType } = req.params as { jobNo: string, orderType: string };

    if (!jobNo) {
        res.status(404).send({ message: "No job record found" })
    }

    const findFactories = await prisma.workOrder.findMany(
        {
            where: { jobNo: jobNo, orderType: orderType },
            // take: 1,
            select: {
                jobNo: true,
                id: true,
                factoryName: true,
                compositions: {
                    select: {
                        workOrderQty: true,
                        id: true,
                    }
                }
            }
        }
    )

    const result: FactoryTotal[] = Object.values(
        findFactories.reduce<Record<string, FactoryTotal>>(
            (acc, item) => {
                const qty = item.compositions.reduce(
                    (sum, composition) => sum + composition.workOrderQty,
                    0
                );

                if (!acc[item.factoryName]) {
                    acc[item.factoryName] = {
                        factoryName: item.factoryName,
                        workOrderQty: qty,
                    };
                } else {
                    const factoryTotal = acc[item.factoryName];
                    if (factoryTotal) {
                        factoryTotal.workOrderQty += qty ?? 0;
                    }
                }

                return acc;
            },
            {}
        )
    );

    if (!result) {
        return res.status(400).send({ message: "No records found" })
    }

    res.status(200).send(result)
}