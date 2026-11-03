import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const getContractJob = async (req: Request, res: Response) => {
    const jobNo = String(req.query.jobNo || "").trim();

    if (!jobNo) {
        return res.status(400).send({
            message: "Job No or Style No is required",
            type: "error",
        });
    }

    try {
        const selectFields = {
            jobNo: true,
            styleNo: true,
            rows: {
                select: {
                    id: true,
                    orderQty: true,
                    composition: true,
                },
            },
        } as const;

        // 1. First search by Job No
        const jobResults = await prisma.styleRequirement.findMany({
            where: {
                jobNo: {
                    contains: jobNo,
                    mode: "insensitive",
                },
            },
            select: selectFields,
        });

        if (jobResults.length > 0) {
            return res.status(200).send(jobResults);
        }

        // 2. If Job No is not found, search by Style No
        const styleResults = await prisma.styleRequirement.findMany({
            where: {
                styleNo: {
                    contains: jobNo,
                    mode: "insensitive",
                },
            },
            select: selectFields,
        });

        if (styleResults.length > 0) {
            return res.status(200).send(styleResults);
        }

        // 3. Neither Job No nor Style No found
        return res.status(404).send({
            message: "No matching Job No or Style No found",
            type: "error",
        });

    } catch (error) {
        console.error("getContractJob error:", error);

        return res.status(500).send({
            message: "Something went wrong. Please try again later",
            type: "error",
        });
    }
};