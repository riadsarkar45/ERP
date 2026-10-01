import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

// ===== MONTH SEARCH SUPPORT =====
const MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
];

// Turns "a", ["a","b"], "a,b" or undefined into a clean string[] (splits on commas only)
const toArray = (value: unknown): string[] => {
    if (value === undefined || value === null) return [];
    const list = Array.isArray(value) ? value : [value];
    return list
        .flatMap((v) => String(v).split(","))
        .map((s) => s.trim())
        .filter(Boolean);
};
// ================================

export const searchChallans = async (req: Request, res: Response) => {
    // Accept 'challans' / 'search', including the axios array form 'challans[]' / 'search[]'
    const rawQuery =
        req.query.challans ??
        req.query["challans[]"] ??
        req.query.search ??
        req.query["search[]"];
    const queryParam = rawQuery === undefined ? undefined : toArray(rawQuery).join(",");
    const context = String(req.query.context || req.query.orderType || req.query.noOrderType || "");

    // Months can come as ?months=august&months=september or months[]=august
    const monthTerms: string[] = toArray(req.query.months ?? req.query["months[]"]).map((m) => m.toLowerCase());

    if (!queryParam && monthTerms.length === 0) {
        return res.status(400).send({ msg: "challans, search or months query parameter is required", type: "error" });
    }

    // Split by comma or space, filter out empty strings
    const terms = queryParam ? queryParam.split(/[\s,]+/).filter(Boolean) : [];

    const challanNos: number[] = [];
    const jobNos: string[] = [];

    // Separate numeric (challan) and string (job no) inputs
    terms.forEach((term) => {
        // A bare month name (e.g. challans=august) is a month search, not a job no
        if (MONTH_NAMES.includes(term.toLowerCase())) {
            monthTerms.push(term.toLowerCase());
            return;
        }

        const num = Number(term);
        if (!Number.isNaN(num)) {
            challanNos.push(num);
        } else {
            jobNos.push(term);
        }
    });

    // Remove duplicate months
    const uniqueMonths = Array.from(new Set(monthTerms));

    if (challanNos.length === 0 && jobNos.length === 0 && uniqueMonths.length === 0) {
        return res.status(400).send({ msg: "No valid challan numbers, job numbers or months provided", type: "error" });
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

    // ===== Month condition on deliveries.deliveryMonth (String column, e.g. "August 2025") =====
    const monthFilter =
        uniqueMonths.length > 0
            ? {
                  OR: uniqueMonths.map((m) => ({
                      deliveryMonth: { startsWith: m, mode: "insensitive" as const },
                  })),
              }
            : null;

    const monthAnd = monthFilter ? { AND: [monthFilter] } : {};

    // Build dynamic OR conditions for Prisma
    const whereConditions: any[] = [];

    if (challanNos.length > 0) {
        whereConditions.push({
            deliveries: {
                some: {
                    deliveryType: { in: deliveryTypes },
                    challanNo: { in: challanNos },
                    ...monthAnd,
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
                    ...monthAnd,
                },
            },
        });
    }

    // Months only (no challan / job no)
    if (challanNos.length === 0 && jobNos.length === 0) {
        whereConditions.push({
            deliveries: {
                some: {
                    deliveryType: { in: deliveryTypes },
                    ...monthAnd,
                },
            },
        });
    }

    const deliverySelectWhere: any = {
        deliveryType: { in: deliveryTypes },
        ...monthAnd,
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
                        deliveryMonth: true,
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