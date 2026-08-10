import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const challanMovement = async (req: Request, res: Response) => {
    const { orderType } = req.params as { orderType: string };

    if (!orderType) {
        return res.status(400).send({ msg: "No order type found", type: "error" });
    }

    console.log(orderType);
    // const where = { orderType };
    const deliveryTypes: string[] = [];
    if (orderType === "knittingOrder") {
        deliveryTypes.push("Yarn Delivery", "Yarn Return", "Grey Received", "Grey Fabric Received", "Finish Received")
    } else if (orderType === "dyeingOrder") {
        deliveryTypes.push("Grey Delivery", "Grey Return", "Grey Received", "Finish Received")
    }else if(orderType === "aopOrder"){
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
            unitePrice: true,
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