import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const challanMovement = async (req: Request, res: Response) => {
    const { orderType, noOrderType } = req.params as { orderType: string, noOrderType: string };

    if (!orderType) {
        return res.status(400).send({ msg: "No order type found", type: "error" });
    }

    console.log(orderType, noOrderType);
    // const where = { orderType };
    const deliveryTypes: string[] = [];

    // Others/no-order-type movements (compacting, reprocess, heat-set,
    // trumble) aren't tied to a priced work order, so unitePrice is
    // treated as optional/not fetched for these — see isOthersType below.
    const isOthersType = ["compacting", "reprocess", "heat-set", "trumble"].includes(noOrderType);

    if (noOrderType === "compacting") {
        deliveryTypes.push("Received From Compacting");
    } else if (noOrderType === "reprocess") {
        deliveryTypes.push("Received From Reprocess");
    } else if (noOrderType === "heat-set") {
        deliveryTypes.push("Received From HEAT Set");
    } else if (noOrderType === "trumble") {
        deliveryTypes.push("Received From Trumble");
    } else if (orderType === "knittingOrder") {
        deliveryTypes.push("Yarn Delivery", "Yarn Return", "Grey Received", "Grey Fabric Received", "Finish Received");
    } else if (orderType === "dyeingOrder") {
        deliveryTypes.push("Grey Delivery", "Grey Return", "Grey Received", "Finish Received");
    } else if (orderType === "aopOrder") {
        deliveryTypes.push("Sent For Aop", "Received From Aop", "AOP Finish Fabric Rcvd", "Return From Aop");
    }

    const deliveries = await prisma.composition.findMany({
        where: {
            orderType: orderType,
            deliveries: {
                some: {
                    deliveryType: { in: deliveryTypes },
                    // challanNo: { in: challans },
                },
            },
        },
        take: 30,
        select: {
            composition: true,
            ...(!isOthersType && { unitePrice: true }),
            id: true,
            workOrderQty: true,
            color: true,
            workOrder: {
                select: {
                    jobNo: true,
                }
            },
            deliveries: {
                where: { deliveryType: { in: deliveryTypes } },
                orderBy: { createdAt: "desc" },
                select: {
                    deliveryQty: true,
                    deliveryDate: true,
                    deliveryType: true,
                    id: true,
                    challanNo: true,
                    toFactory: true,
                    fromFactory: true,
                }
            }
        },
    });


    return res.status(200).send({ msg: "Deliveries found", type: "success", data: deliveries });
};

export const challanMovementByChallanNo = async (req: Request, res: Response) => {
    const { challanNo, deliveryType, orderType, jobNo } = req.params as { challanNo: string, jobNo: string, deliveryType: string, orderType: string };

    if (!challanNo || !orderType) {
        return res.status(400).send({ msg: "Missing required parameters", type: "error" });
    }

    console.log("challanNo ->", challanNo, "deliveryType ->", deliveryType, "orderType->", orderType);
    try {

        const findComps = await prisma.composition.findMany(
            {
                where: {
                    orderType: orderType, workOrder: {
                        jobNo: jobNo,
                    }
                },
                select: {
                    composition: true,

                    deliveries: {
                        where: { challanNo: Number(challanNo) },
                        orderBy: {id: "desc"},
                        select: {
                            id: true,
                            deliveryQty: true,
                            deliveryType: true,
                            challanNo: true,
                            createdAt: true,
                            toFactory: true,
                            fromFactory: true,
                        }
                    }
                }
            }
        )

        if (!findComps || findComps.length === 0) {
            return res.status(404).send({ msg: "No deliveries found for the given challan number", type: "error" });
        }

        const filteredComps = findComps.filter((comp) => comp.deliveries.length > 0);

        if (filteredComps.length === 0) {
            return res.status(404).send({ msg: "No deliveries found for the given challan number", type: "error" });
        }

        return res.status(200).send({ data: filteredComps });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }

}