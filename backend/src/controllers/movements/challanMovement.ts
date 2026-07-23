import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const challanMovement = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };
    console.log(orderType);

    if (!orderType) {
        return res.status(400).send({ msg: "No order type found", type: "error" });
    }

    const movementChallan = await prisma.composition.findMany({
        where: { orderType: orderType },
        select: {
            id: true,
            composition: true,
            unitePrice: true,
            color: true,
            workOrder: {
                select: {
                    jobId: true,
                    jobNo: true,
                }
            },
            challans: {
                select: {
                    id: true,
                    challanNo: true,
                    challanDate: true,
                    toFactory: true,
                    fromFactory: true,
                    deliveries: {
                        select: {
                            id: true,
                            challanNo: true,
                            deliveryDate: true,
                            deliveryQty: true,
                            deliveryType: true
                        }
                    }
                }
            }
        }
    });

    // Fix: findMany returns an array, so we must check the length
    if (!movementChallan || movementChallan.length === 0) {
        return res.status(400).send({ msg: "No challan found", type: "error" });
    }

    // --- DATA TRANSFORMATION ---
    // Group and sum deliveryQty by deliveryType for each challan
    const transformedData = movementChallan.map(composition => {
        const transformedChallans = composition.challans.map(challan => {

            // 1. Sum quantities by deliveryType
            const deliverySums = challan.deliveries.reduce((acc, delivery) => {
                const type = delivery.deliveryType;
                acc[type] = (acc[type] || 0) + delivery.deliveryQty;
                return acc;
            }, {} as Record<string, number>);

            // 2. Convert the summed object back into a clean array
            const summedDeliveries = Object.keys(deliverySums).map(type => ({
                deliveryType: type.replace(/\s+/g, ""),
                totalQty: deliverySums[type]
            }));

            return {
                ...challan,
                deliveries: summedDeliveries // Replace original deliveries with summed ones
            };
        });

        return {
            ...composition,
            challans: transformedChallans
        };
    });

    // Return 200 OK for successful GET requests
    return res.status(200).send(transformedData);
};