import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const ALL_FACTORIES = "ALL FOUR FACTORIES";

export const assetItems = async (req: Request, res: Response) => {

    const userStation = req.user?.workingStation?.trim();

    if (!userStation) {
        return res
            .status(403)
            .send({ message: "No working station assigned to this user", type: "error" });
    }

    const requestedRaw = req.params.workingStation;
    const requestedValue = Array.isArray(requestedRaw) ? requestedRaw[0] : requestedRaw;
    const requested = requestedValue ? decodeURIComponent(requestedValue).trim() : "";

    const isAllAccess = userStation === ALL_FACTORIES;

    let factoryFilter: string | null; // null = no factory filter

    if (isAllAccess) {
        factoryFilter =
            requested && requested !== ALL_FACTORIES && requested !== "ALL"
                ? requested
                : null;
    } else {
        if (requested && requested !== userStation) {
            return res
                .status(403)
                .send({ message: "You are not authorized to access assets from this station.", type: "error" });
        }
        factoryFilter = userStation;
    }

    const where = factoryFilter ? { workingStation: factoryFilter } : {};

    try {
        const items = await prisma.fixAsset.findMany(
            {
                where,
                orderBy: [{ createdAt: "desc" }],
                select: {
                    id: true,
                    additionsQty: true,
                    openingQty: true,
                    receivedQty: true,
                    sentQty: true,
                    priceValue: true,
                    origin: true,
                    model: true,
                    remarks: true,
                    createdAt: true,
                    createdBy: true,
                    workingStation: true,
                    amount: true,
                    assetCode: true,
                    assetId: true,
                    assetType: true,
                    category: true,
                    challanNo: true,
                    description: true,
                    destination: true,
                    disposedQty: true,
                    factoryName: true,
                    from: true,
                    sku: true,
                    source: true,
                    supplier: true,
                }
            }
        )

        if(!items || items.length === 0) {
            return res.status(404).send({ message: "No asset items found.", type: "error" });
        }

        return res.status(200).send({ message: "Asset items fetched successfully.", type: "success", data: items });

    }catch (error) {
        console.error("Error fetching asset items:", error);
        return res.status(500).send({ message: "An error occurred while fetching asset items.", type: "error" });
    }
}