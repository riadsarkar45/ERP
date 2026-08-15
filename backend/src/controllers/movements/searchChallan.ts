import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";


export const searchChallans = async (req: Request, res: Response) => {
    const challansQuery = req.query.challans;
    // "context" is sent as a query param by the frontend (?context=knitting),
    // not a route param — this used to read req.params.orderType, which was
    // always undefined once the route no longer has a :orderType segment.
    console.log("route hit");
    const orderType = String(req.query.context || req.query.orderType || "")
    if (!challansQuery) {
        console.log("challan required");
        return res.status(400).send({ msg: "challans query parameter is required", type: "error" });
    }
    console.log("route hit", { orderType });

    const deliveryTypes: string[] = [];
    if (orderType === "knitting" || orderType === "knittingOrder") {
        deliveryTypes.push(
            "Yarn Delivery",
            "Yarn Return",
            "Grey Received",
            "Grey Fabric Received",
            "Finish Received"
        );
    } else if (orderType === "dyeingOrder") {
        deliveryTypes.push("Grey Delivery", "Grey Return", "Grey Received", "Finish Received", "Received From Compacting", "Received From Reprocess")
    } else if (orderType === "aopOrder") {
        deliveryTypes.push("Sent For Aop", "Received From Aop", "AOP Finish Fabric Rcvd", "Return From Aop");
    }
    // TODO: add branches here for other contexts (e.g. "dyeing", "aop") as
    // those search pages come online, same as the pattern above.

    const challans = challansQuery
        .toString()
        .split(",")
        .map((challan) => Number(challan.trim()))
        .filter((challan) => !Number.isNaN(challan));

    if (challans.length === 0) {
        return res.status(400).send({ msg: "No valid challan numbers provided", type: "error" });
    }

    if (deliveryTypes.length === 0) {
        return res.status(400).send({ msg: `Unknown or missing context "${orderType}"`, type: "error" });
    }

    const deliveries = await prisma.composition.findMany({
        where: {
            orderType: orderType,
            deliveries: {
                some: {
                    deliveryType: { in: deliveryTypes },
                    challanNo: { in: challans },
                },
            },
        },
        select: {
            composition: true,
            color: true,
            unitePrice: true,
            id: true,
            workOrderQty: true,
            workOrder: {
                select: { jobNo: true },
            },
            deliveries: {
                where: { deliveryType: { in: deliveryTypes }, challanNo: { in: challans } },
                select: {
                    deliveryQty: true,
                    deliveryDate: true,
                    deliveryType: true,
                    id: true,
                    challanNo: true,
                    toFactory: true,
                    fromFactory: true,
                },
            },
        },
    });


    // Returns the exact same structure as challanMovement
    return res.status(200).send({ msg: "Deliveries found", type: "success", data: deliveries });
};