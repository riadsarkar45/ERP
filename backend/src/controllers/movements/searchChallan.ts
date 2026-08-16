import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";


export const searchChallans = async (req: Request, res: Response) => {
    const challansQuery = req.query.challans;
    // "context" is sent as a query param by the frontend (?context=knitting),
    // not a route param — this used to read req.params.orderType, which was
    // always undefined once the route no longer has a :orderType segment.
    console.log("route hit");
    const context = String(req.query.context || req.query.orderType || req.query.noOrderType || "");

    if (!challansQuery) {
        console.log("challan required");
        return res.status(400).send({ msg: "challans query parameter is required", type: "error" });
    }
    console.log("route hit", { context });

    const deliveryTypes: string[] = [];
    // dbOrderType is the value that actually lives on composition.orderType
    // in the DB — always one of "knittingOrder"/"dyeingOrder"/"aopOrder".
    // The "Others" contexts (compacting/reprocess/heat-set/trumble) are all
    // sub-movements of dyeing compositions, so they resolve to
    // "dyeingOrder" here even though the context string itself is
    // "compacting" etc. Previously the raw context string was used
    // directly as `orderType` in the Prisma where clause, which never
    // matched any real composition row.
    let dbOrderType = "";
    const isOthersType = ["compacting", "reprocess", "heat-set", "trumble"].includes(context);

    if (context === "compacting") {
        deliveryTypes.push("Received From Compacting");
        dbOrderType = "dyeingOrder";
    } else if (context === "reprocess") {
        deliveryTypes.push("Received From Reprocess");
        dbOrderType = "dyeingOrder";
    } else if (context === "heat-set") {
        deliveryTypes.push("Received From HEAT Set");
        dbOrderType = "dyeingOrder";
    } else if (context === "trumble") {
        deliveryTypes.push("Received From Trumble");
        dbOrderType = "dyeingOrder";
    } else if (context === "knitting" || context === "knittingOrder") {
        deliveryTypes.push(
            "Yarn Delivery",
            "Yarn Return",
            "Grey Received",
            "Grey Fabric Received",
            "Finish Received"
        );
        dbOrderType = "knittingOrder";
    } else if (context === "dyeing" || context === "dyeingOrder") {
        deliveryTypes.push("Grey Delivery", "Grey Return", "Grey Received", "Finish Received", "Received From Compacting", "Received From Reprocess");
        dbOrderType = "dyeingOrder";
    } else if (context === "aop" || context === "aopOrder") {
        deliveryTypes.push("Sent For Aop", "Received From Aop", "AOP Finish Fabric Rcvd", "Return From Aop");
        dbOrderType = "aopOrder";
    }
    // TODO: add branches here for other contexts as those search pages
    // come online, same as the pattern above — remember to set dbOrderType
    // to the real composition.orderType value, not the context string.

    const challans = challansQuery
        .toString()
        .split(",")
        .map((challan) => Number(challan.trim()))
        .filter((challan) => !Number.isNaN(challan));

    if (challans.length === 0) {
        return res.status(400).send({ msg: "No valid challan numbers provided", type: "error" });
    }

    if (deliveryTypes.length === 0) {
        return res.status(400).send({ msg: `Unknown or missing context "${context}"`, type: "error" });
    }

    const deliveries = await prisma.composition.findMany({
        where: {
            orderType: dbOrderType,
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
            ...(isOthersType && { unitePrice: true }),
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