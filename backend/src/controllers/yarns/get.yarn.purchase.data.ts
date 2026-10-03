import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getYarnPurchaseData = async (req: Request, res: Response) => {

    const { piNo } = req.params;

    try {

        const purchaseData = await prisma.yarnPoModel.findMany(
            {
                where: piNo?.toString() ? { piNo: piNo?.toString() } : {},
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
                        }
                    }
                }
            }
        )

        if(!purchaseData || purchaseData.length === 0) {
            return res.status(404).json({ message: "No purchase data found", type: "error" });
        }

        return res.status(200).json({ message: "Purchase data fetched successfully", type: "success", data: purchaseData });

    }catch (error) {
        console.error("Error fetching yarn purchase data:", error);
        return res.status(500).json({ message: "Something went wrong. Please don't try again later", type: "error" });
    }

}