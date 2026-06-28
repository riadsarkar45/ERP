import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { calculateOrdersForStyleSummary } from "../../utils/yarnCompStat";

export const styleRequirements = async (req: Request, res: Response) => {
    const { jobNo } = req.params as { jobNo: string | undefined };

    // Pagination params from query string
    // e.g. GET /api/styles?limit=20&cursor=abc123
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // max 100
    const cursorRaw = req.query.cursor as string | undefined;
    const cursor = cursorRaw ? parseInt(cursorRaw) : undefined;

    const whereClause: any = jobNo ? { jobNo } : {};

    // Fetch limit+1 to know if there's a next page
    const styles = await prisma.styleRequirement.findMany({
        where: whereClause,
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { id: "asc" },
        select: {
            salesContact: true,
            styleNo: true,
            buyerName: true,
            jobNo: true,
            processLoss: true,
            poNo: true,
            id: true,
            rows: {
                select: {
                    id: true,
                    color: true,
                    composition: true,
                    finishDia: true,
                    orderQty: true,
                    finishRequiredQty: true,
                }
            },
            sizes: {
                select: {
                    id: true,
                    sizeName: true,
                }
            },
            workOrders: {
                select: {
                    orderType: true,
                    compositions: {
                        select: {
                            color: true,
                            composition: true,
                            workOrderQty: true,
                            deliveries: {
                                select: {
                                    deliveryType: true,
                                    deliveryQty: true,
                                }
                            },
                        }
                    },
                }
            }
        }
    });

    if (styles.length === 0) {
        return res.status(404).send({ message: "No style requirements found", type: "error" });
    }

    // Check if there's a next page
    const hasNextPage = styles.length > limit;
    const pageData = hasNextPage ? styles.slice(0, limit) : styles;
    const lastItem = pageData[pageData.length - 1];
    const nextCursor = hasNextPage && lastItem ? String(lastItem.id) : null;

    const summaryData = calculateOrdersForStyleSummary(pageData);

    res.status(200).send({
        data: summaryData,
        pagination: {
            nextCursor,        // pass this as ?cursor= in the next request
            hasNextPage,
            limit,
        },
        type: "success"
    });
};