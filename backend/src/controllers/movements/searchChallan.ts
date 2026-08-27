import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const searchChallans = async (req: Request, res: Response) => {
    // Accept BOTH 'challans' and 'search' to prevent 400 errors
    const queryParam = req.query.challans || req.query.search;
    const context = String(req.query.context || req.query.orderType || req.query.noOrderType || "");

    if (!queryParam) {
        return res.status(400).send({ msg: "challans or search query parameter is required", type: "error" });
    }

    // Split by comma or space, filter out empty strings
    const terms = queryParam.toString().split(/[\s,]+/).filter(Boolean);
    
    const challanNos: number[] = [];
    const jobNos: string[] = [];

    // Separate numeric (challan) and string (job no) inputs
    terms.forEach((term) => {
        const num = Number(term);
        if (!Number.isNaN(num)) {
            challanNos.push(num);
        } else {
            jobNos.push(term);
        }
    });

    if (challanNos.length === 0 && jobNos.length === 0) {
        return res.status(400).send({ msg: "No valid challan numbers or job numbers provided", type: "error" });
    }

    const deliveryTypes: string[] = [];
    let dbOrderType = "";

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
        deliveryTypes.push("Yarn Delivery", "Yarn Return", "Grey Received", "Grey Fabric Received", "Finish Received");
        dbOrderType = "knittingOrder";
    } else if (context === "dyeing" || context === "dyeingOrder") {
        deliveryTypes.push("Grey Delivery", "Grey Return", "Grey Received", "Finish Received", "Received From Compacting", "Received From Reprocess");
        dbOrderType = "dyeingOrder";
    } else if (context === "aop" || context === "aopOrder") {
        deliveryTypes.push("Sent For Aop", "Received From Aop", "AOP Finish Fabric Rcvd", "Return From Aop");
        dbOrderType = "aopOrder";
    }

    if (deliveryTypes.length === 0) {
        return res.status(400).send({ msg: `Unknown or missing context "${context}"`, type: "error" });
    }

    // Build dynamic OR conditions for Prisma
    const whereConditions: any[] = [];

    if (challanNos.length > 0) {
        whereConditions.push({
            deliveries: {
                some: {
                    deliveryType: { in: deliveryTypes },
                    challanNo: { in: challanNos },
                },
            },
        });
    }

    if (jobNos.length > 0) {
        whereConditions.push({
            workOrder: {
                jobNo: { in: jobNos },
            },
            deliveries: {
                some: {
                    deliveryType: { in: deliveryTypes },
                },
            },
        });
    }

    const deliverySelectWhere: any = {
        deliveryType: { in: deliveryTypes },
    };
    
    // If challan numbers were provided, restrict deliveries to those challans
    if (challanNos.length > 0) {
        deliverySelectWhere.challanNo = { in: challanNos };
    }

    try {
        const deliveries = await prisma.composition.findMany({
            where: {
                orderType: dbOrderType,
                OR: whereConditions,
            },
            select: {
                composition: true,
                color: true,
                id: true,
                workOrderQty: true,
                workOrder: {
                    select: { jobNo: true },
                },
                deliveries: {
                    where: deliverySelectWhere,
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

        return res.status(200).send({ msg: "Deliveries found", type: "success", data: deliveries });
    } catch (error) {
        console.error("Search error:", error);
        return res.status(500).send({ msg: "Internal server error", type: "error" });
    }
};