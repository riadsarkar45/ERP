import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const challanMovement = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };

    if (!orderType) {
        return res.status(400).send({ msg: "No order type found", type: "error" });
    }

    // Pagination params — default to page 1, 10 compositions per page.
    // Query looks like: /api/challan-movement/dyeingOrder?page=2&limit=10
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10)); // cap to avoid abuse
    const skip = (page - 1) * limit;

    const where = { orderType };

    // Run the page query and the total count in parallel.
    const [movementChallan, totalCount] = await Promise.all([
        prisma.composition.findMany({
            where,
            skip,
            take: limit,
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
        }),
        prisma.composition.count({ where })
    ]);

    if (!movementChallan || movementChallan.length === 0) {
        return res.status(400).send({ msg: "No challan found", type: "error" });
    }

    // --- DATA TRANSFORMATION ---
    const transformedData = movementChallan.map(composition => {
        const transformedChallans = composition.challans.map(challan => {
            const deliverySums = challan.deliveries.reduce((acc, delivery) => {
                const type = delivery.deliveryType;
                acc[type] = (acc[type] || 0) + delivery.deliveryQty;
                return acc;
            }, {} as Record<string, number>);

            const summedDeliveries = Object.keys(deliverySums).map(type => ({
                deliveryType: type.replace(/\s+/g, ""),
                totalQty: deliverySums[type]
            }));

            return {
                ...challan,
                deliveries: summedDeliveries
            };
        });

        return {
            ...composition,
            challans: transformedChallans
        };
    });

    return res.status(200).send({
        data: transformedData,
        pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.max(1, Math.ceil(totalCount / limit)),
        }
    });
};