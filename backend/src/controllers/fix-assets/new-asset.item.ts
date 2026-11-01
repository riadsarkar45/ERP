import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const newAssetItem = async (req: Request, res: Response) => {

    if (!req.body) {
        return res.status(400).send({ message: "Request body is missing." });
    }

    const userId = req.user?.userId;
    const workingStation = req.user?.workingStation;

    if (!userId || !workingStation) {
        return res.status(400).send({ message: "User information is missing." });
    }

    try {
        const createAssetItem = await prisma.fixAsset.create(
            {
                data: {
                    ...req.body,
                    createdBy: Number(userId),
                    workingStation: workingStation
                }
            }
        )

        if (!createAssetItem) {
            return res.status(500).send({ message: "Failed to create asset item.", type: "error" });
        }

        return res.status(201).send({ message: "Asset item created successfully.", type: "success" });

    } catch (error) {
        console.error("Error creating asset item:", error);
        return res.status(500).send({ message: "An error occurred while creating the asset item.", type: "error" });
    }
}