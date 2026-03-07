import prisma from "../database/prismaClient/prisma";
import type { Request, Response } from "express";
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const factoryOrderDetail = await prisma.factory.findMany(
            {
                select: {
                    id: true,
                    factoryName: true,
                    type: true,
                    workOrders: {
                        select: {
                            workOrderNo: true,
                            workOrderPlaceDate: true,
                            salesContractNo: true,
                            bookingColor: true,
                            composition: true,
                            dia: true,
                            yarnCount: true,
                            brandLot: true,
                            yarnDyeingColor: true,
                            yarnDeliveryForYD: true,
                            yarnDyedWorkOrderQty: true,
                            yarnReturnReceived: true,
                            yarnStock: true,
                            finishYarnReceived: true,
                            ydProcessLossVariation: true,
                            ydPricePerKg: true,
                            ydProcessLoss: true,
                            greyReceivedFromYD: true,
                            processLossAfterYD: true,
                            delShortExcess: true,
                            totalBillingAmount: true,
                            deductionForDebitNote: true,
                            pendingBillingAmount: true,
                            paidBillingAmount: true,
                            billNo: true,
                            remarks: true,
                            createdAt: true
                        }
                    }
                },

            }
        )

        if (!factoryOrderDetail) {
            return res.status(404).send({ message: "No factory order details found" });
        }
        res.status(200).send(factoryOrderDetail);
    } catch (e) {
        console.log(e);
    }
}