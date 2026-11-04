import type { Request, Response } from "express";
import prisma from "../../../database/prismaClient/prisma";

export const searchJobForWorkOrder = async (
    req: Request,
    res: Response
) => {
    const jobNo = String(req.query.jobNo || "").trim();

    if (!jobNo) {
        return res.status(400).send({
            message: "Job No is required",
            type: "error",
        });
    }

    try {
        const jobResults = await prisma.styleRequirement.findMany({
            where: {
                jobNo: {
                    contains: jobNo,
                    mode: "insensitive",
                },
            },
            select: {
                id: true,
                buyerName: true,
                jobNo: true,
                styleNo: true,
                salesContact: true,
                poNo: true,
                processLoss: true,

                rows: {
                    select: {
                        id: true,
                        composition: true,
                        color: true,
                        finishDia: true,
                        additional: true,
                        finishRequiredQty: true,
                        processLoss: true,
                        orderQty: true,
                    },
                },
            },
            orderBy: {
                jobNo: "asc",
            },
            take: 20,
        });

        return res.status(200).send({
            type: "success",
            data: jobResults,
        });

    } catch (error) {
        console.error("searchJobForWorkOrder error:", error);

        return res.status(500).send({
            message: "Something went wrong. Please try again later",
            type: "error",
        });
    }
};