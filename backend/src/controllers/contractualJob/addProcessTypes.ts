
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";

interface ProcessTypeInput {
    processType: string;
    price: number;
}

export const addProcessTypes = async (
    req: Request,
    res: Response
): Promise<Response> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                message: "User authentication failed.",
                type: "error",
            });
        }

        if (!Array.isArray(req.body) || req.body.length === 0) {
            return res.status(400).json({
                message: "No items found to insert.",
                type: "error",
            });
        }

        const processTypes: ProcessTypeInput[] = [];
        const seenTypes = new Set<string>();

        for (const item of req.body as unknown[]) {
            if (
                typeof item !== "object" ||
                item === null ||
                !("processType" in item) ||
                !("price" in item)
            ) {
                return res.status(400).json({
                    message: "Each item must contain processType and price.",
                    type: "error",
                });
            }

            const input = item as Record<string, unknown>;

            if (
                typeof input.processType !== "string" ||
                input.processType.trim().length === 0
            ) {
                return res.status(400).json({
                    message: "Process type must be a non-empty string.",
                    type: "error",
                });
            }

            if (
                typeof input.price !== "number" ||
                !Number.isFinite(input.price) ||
                input.price < 0
            ) {
                return res.status(400).json({
                    message: "Process rate must be a valid non-negative number.",
                    type: "error",
                });
            }

            const processType = input.processType.trim();

            // Case-insensitive duplicate detection within the request
            const normalizedType = processType.toLowerCase();

            if (seenTypes.has(normalizedType)) {
                return res.status(409).json({
                    message: `Duplicate process type in request: ${processType}`,
                    type: "error",
                });
            }

            seenTypes.add(normalizedType);

            processTypes.push({
                processType,
                price: input.price,
            });
        }

        // Check existing records in the database
        const existingTypes = await prisma.processTypes.findMany({
            where: {
                OR: processTypes.map((item) => ({
                    processType: {
                        equals: item.processType,
                        mode: "insensitive",
                    },
                })),
            },
            select: {
                processType: true,
            },
        });

        if (existingTypes.length > 0) {
            return res.status(409).json({
                message: "Some process types already exist.",
                type: "error",
                duplicates: existingTypes.map(
                    (item) => item.processType
                ),
            });
        }

        const result = await prisma.processTypes.createMany({
            data: processTypes.map((item) => ({
                processType: item.processType,
                processRate: String(item.price),
                createdBy: String(userId),
            })),
        });

        return res.status(201).json({
            message: "Process types added successfully.",
            type: "success",
            insertedCount: result.count,
        });
    } catch (error: unknown) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return res.status(409).json({
                message: "Duplicate process type is not allowed.",
                type: "error",
            });
        }

        console.error("Error adding process types:", error);

        return res.status(500).json({
            message: "Something went wrong. Please try again later.",
            type: "error",
        });
    }
};


export const getProcessTypes = async (req: Request, res: Response) => {
    const processes = await prisma.processTypes.findMany(
        {
            select: {
                processType: true,
            }
        }
    )

    if(!processes){
        return res.status(400).send({message: "No process found", type: "error"})
    }

    return res.status(200).send(processes)
}