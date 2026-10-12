import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const joinDeliveries = async (req: Request, res: Response) => {
    try {

        const { jobNo } = req.params as { jobNo: string }

        if (!jobNo) {
            return res.status(404).send({ message: "Missing required fields" })
        }

        const workOrderData = await prisma.jobs.findUnique(
            {
                where: {
                    jobNo: jobNo
                },
                select: {
                    workOrders: {
                        where: { orderType: "dyeingOrder" },
                        select: {
                            factoryName: true,
                            compositions: {
                                where: {orderType: "dyeingOrder"},
                                select: {
                                    id: true,
                                    orderType: true,
                                }
                            }
                        }
                    }
                }
            }
        )

        res.status(200).send(workOrderData)

    } catch (error) {
        console.error("joinDeliveries failed:", error);
        return res.status(500).send({ message: "Internal server error", type: "error" });
    }
};