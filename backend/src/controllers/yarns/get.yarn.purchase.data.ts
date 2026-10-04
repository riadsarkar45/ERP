import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const round = (n: number) => Math.round(n * 1000) / 1000;

const toKey = (type: string) => type.replace(/\s+/g, "");

const DEFAULT_KEYS = ["ReceivedFromSpinning", "ReturnToSpinning"];

type Movement = {
    id: number;
    challanNo: number | null;
    movementQty: number;
    movementType: string;
    movementDate: Date;
};

// { ReceivedFromSpinning: 500, ReturnToSpinning: 50 }
const sumByType = (movements: Movement[]): Record<string, number> => {
    const totals: Record<string, number> = {};
    for (const key of DEFAULT_KEYS) totals[key] = 0;

    for (const m of movements) {
        const key = toKey(m.movementType);
        totals[key] = (totals[key] ?? 0) + m.movementQty;
    }

    for (const key of Object.keys(totals)) totals[key] = round(totals[key] ?? 0);
    return totals;
};

export const getYarnPurchaseData = async (req: Request, res: Response) => {
    const piNo = req.params.piNo ? String(req.params.piNo) : undefined;

    try {
        const purchaseData = await prisma.yarnPoModel.findMany({
            where: piNo ? { piNo } : {},
            select: {
                id: true,
                piNo: true,
                piDate: true,
                supplierName: true,
                lcNo: true,
                poNo: true,
                isAuthorized: true,
                remarks: true,
                items: {
                    select: {
                        id: true,
                        yarnCount: true,
                        composition: true,
                        poQty: true,
                        spinningMovement: {
                            select: {
                                id: true,
                                challanNo: true,
                                movementQty: true,
                                movementType: true,
                                movementDate: true,
                            },
                            orderBy: { movementDate: "asc" },
                        },
                    },
                },
            },
        });

        if (!purchaseData || purchaseData.length === 0) {
            return res.status(404).json({ message: "No purchase data found", type: "error" });
        }

        const data = purchaseData.map((po) => {
            const allMovements: Movement[] = [];

            const items = po.items.map((item) => {
                allMovements.push(...item.spinningMovement);

                return {
                    ...item,
                    // same challans, in the field names the modal reads
                    challans: item.spinningMovement.map((m) => ({
                        id: m.id,
                        challanNo: m.challanNo,
                        quantity: m.movementQty,
                        date: m.movementDate,
                        deliveryType: m.movementType, // keeps spaces, matches the dropdown values
                    })),
                    movementTotals: sumByType(item.spinningMovement),
                };
            });

            return {
                ...po,
                items,
                summary: {
                    poQty: round(po.items.reduce((sum, i) => sum + i.poQty, 0)),
                    movementTotals: sumByType(allMovements),
                },
            };
        });

        return res.status(200).json({
            message: "Purchase data fetched successfully",
            type: "success",
            data,
        });
    } catch (error) {
        console.error("Error fetching yarn purchase data:", error);
        return res.status(500).json({
            message: "Something went wrong. Please try again later",
            type: "error",
        });
    }
};