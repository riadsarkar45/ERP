import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";

export const insertYarnPiData = async (req: Request, res: Response) => {
    const { piNo, piDate, supplierName, lcNo, poNo, remarks, items } = req.body;

    if (!piNo || !piDate || !supplierName || !lcNo || !poNo || !remarks) {
        return res.status(400).json({ message: "All fields are required", type: "error" });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one item is required", type: "error" });
    }

    const parsedDate = new Date(piDate);
    if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid PI date", type: "error" });
    }

    const cleanItems: { yarnCount: string; composition: string; poQty: number }[] = [];
    for (const [i, item] of items.entries()) {
        const poQty = Number(item?.poQty);
        if (!item?.yarnCount || !item?.composition || !Number.isFinite(poQty) || poQty <= 0) {
            return res.status(400).json({
                message: `Item ${i + 1}: yarn count, composition and a valid PO quantity are required`,
                type: "error",
            });
        }
        cleanItems.push({
            yarnCount: String(item.yarnCount).trim(),
            composition: String(item.composition).trim(),
            poQty,
        });
    }

    try {
        const createdPo = await prisma.yarnPoModel.create({
            data: {
                piNo,
                piDate: parsedDate,
                supplierName,
                lcNo,
                poNo,
                remarks,
                items: { create: cleanItems },
            },
            include: { items: true },
        });

        return res.status(201).json({
            message: "Yarn PI data inserted successfully",
            type: "success",
            data: createdPo,
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return res.status(409).json({ message: `PO No "${poNo}" already exists`, type: "error" });
        }
        console.error("Error inserting yarn PI data:", error);
        return res.status(500).json({ message: "Internal server error", type: "error" });
    }
};