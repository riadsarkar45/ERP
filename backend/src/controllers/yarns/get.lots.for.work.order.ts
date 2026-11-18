import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const MOVEMENT_TYPES = {
    IN: "Received From Spinning",
    OUT: "Return To Spinning",
} as const;

export const getLotsAndYarnCounts = async (req: Request, res: Response) => {
    try {
        const grouped = await prisma.spinningYarnMovement.groupBy({
            by: ["yarnPoItemsId", "lotNo", "yarnCount", "movementType"],
            where: {
                movementType: { in: [MOVEMENT_TYPES.IN, MOVEMENT_TYPES.OUT] },
                yarnPoItemsId: { not: null },
            },
            _sum: { movementQty: true },
        });

        // PO item -> PI number
        const itemIds = [
            ...new Set(
                grouped
                    .map((g) => g.yarnPoItemsId)
                    .filter((id): id is number => id !== null)
            ),
        ];

        const items = await prisma.yarnPoItems.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, yarnPo: { select: { piNo: true } } },
        });

        const piByItem = new Map<number, string>(
            items.map((item) => [item.id, String(item.yarnPo?.piNo ?? "").trim()])
        );

        // Net balance per PI + Lot + Yarn Count
        const balances = new Map<
            string,
            { piNo: string; lotNo: string; yarnCount: string; totalQuantity: number }
        >();

        for (const g of grouped) {
            if (g.yarnPoItemsId === null) continue;

            const piNo = piByItem.get(g.yarnPoItemsId);
            if (!piNo) continue;

            const key = JSON.stringify([piNo, g.lotNo, g.yarnCount]);
            const qty = g._sum.movementQty ?? 0;
            const signed = g.movementType === MOVEMENT_TYPES.IN ? qty : -qty;

            const current = balances.get(key);
            if (current) {
                current.totalQuantity += signed;
            } else {
                balances.set(key, {
                    piNo,
                    lotNo: String(g.lotNo),
                    yarnCount: String(g.yarnCount),
                    totalQuantity: signed,
                });
            }
        }

        const data = Array.from(balances.values())
            .map((b) => ({ ...b, totalQuantity: Number(b.totalQuantity.toFixed(3)) }))
            .filter((b) => b.totalQuantity > 0)
            .sort(
                (a, b) =>
                    a.lotNo.localeCompare(b.lotNo) ||
                    a.yarnCount.localeCompare(b.yarnCount) ||
                    a.piNo.localeCompare(b.piNo)
            );

        return res.status(200).json({
            success: true,
            count: data.length,
            data,
        });
    } catch (error) {
        console.error("Failed to fetch lots and yarn counts:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch lots and yarn counts",
        });
    }
};