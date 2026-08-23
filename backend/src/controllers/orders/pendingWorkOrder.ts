import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const VALID_ORDER_TYPES = ["knittingOrder", "dyeingOrder", "aopOrder"] as const;
type OrderType = (typeof VALID_ORDER_TYPES)[number];

export const pendingWorkOrders = async (
    req: Request,
    res: Response
) => {
    try {
        const { orderType } = req.params as {
            orderType: string;
        };

        if (!VALID_ORDER_TYPES.includes(orderType as OrderType)) {
            return res.status(400).json({
                message: `Invalid orderType. Must be one of: ${VALID_ORDER_TYPES.join(", ")}`,
                type: "error",
            });
        }

        // Search is optional — only applied if the user typed something
        const search = String(req.query.search ?? "").trim();
        const numericSearch = Number(search);

        const findPendingWorkOrders = await prisma.workOrder.findMany({
            where: {
                isApproved: false,
                compositions: {
                    some: {
                        orderType,
                    },
                },
                ...(search
                    ? {
                          OR: [
                              { jobNo: { contains: search, mode: "insensitive" } },
                              { workOrderNo: { contains: search, mode: "insensitive" } },
                              { factoryName: { contains: search, mode: "insensitive" } },
                              { lotNo: { contains: search, mode: "insensitive" } },
                              { stichLength: { contains: search, mode: "insensitive" } },
                              { machineDia: { contains: search, mode: "insensitive" } },
                              { yarnCount: { contains: search, mode: "insensitive" } },
                              {
                                  styleRequirement: {
                                      buyerName: { contains: search, mode: "insensitive" },
                                  },
                              },
                              {
                                  compositions: {
                                      some: {
                                          composition: { contains: search, mode: "insensitive" },
                                          ...(Number.isFinite(numericSearch)
                                              ? { workOrderQty: { equals: numericSearch } }
                                              : {}),
                                      },
                                  },
                              },
                              ...(Number.isFinite(numericSearch)
                                  ? [
                                        {
                                            compositions: {
                                                some: {
                                                    unitePrice: { equals: numericSearch },
                                                },
                                            },
                                        },
                                    ]
                                  : []),
                          ],
                      }
                    : {}),
            },
            select: {
                id: true,
                workOrderNo: true,
                factoryName: true,
                lotNo: true,
                yarnCount: true,
                machineDia: true,
                stichLength: true,
                jobNo: true,
                styleRequirement: {
                    select: {
                        buyerName: true,
                        processLoss: true,
                        styleNo: true,
                    },
                },
                compositions: {
                    where: { orderType },
                    select: {
                        id: true,
                        unitePrice: true,
                        workOrderQty: true,
                        color: true,
                        composition: true,
                    },
                },
            },
            orderBy: { id: "desc" },
        });

        return res.status(200).json(findPendingWorkOrders);
    } catch (error) {
        console.error("Pending Work Orders Error:", error);
        return res.status(500).json({
            message: "Failed to fetch pending work orders",
            type: "error",
        });
    }
};