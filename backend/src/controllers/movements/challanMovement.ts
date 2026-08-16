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
        // take: 30,
        select: {
            composition: true,
            // Only fetched for normal order-type movements — Others
            // (compacting/reprocess/heat-set/trumble) have no associated
            // price, so it's omitted from the query rather than always
            // coming back null.
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