import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { checkDataExist } from "../../utils/checkIfDataExist";
import { successResponse, errorResponse, validationError } from "../../utils/responseHandler";

export const createNewJob = async (req: Request, res: Response) => {
    const {
        compositions,
        orderType,
        jobNo,
        workOrderNo,
        workOrderPlaceDate,
        month,
        styleNo,
        lotNo
    } = req.body as {
        compositions: { composition: string; color: string; workOrderQty: string, orderQty: string, unitPrice: string, }[];
        orderType: string;
        jobNo: string;
        workOrderNo: string;
        workOrderPlaceDate: string;
        month: string;
        styleNo: string;
        lotNo: string;
    };

    try {
        if (!jobNo || !workOrderNo || !styleNo) {
            return res.status(400).json(validationError("Job number, work order number, and style number are required"));
        }

        const findStyleNo = await prisma.styleRequirement.findUnique({
            where: { styleNo: styleNo }
        });

        if (!findStyleNo) {
            return res.status(400).json(validationError("Style number not found"));
        }

        const getJobNo = await checkDataExist(jobNo);
        const jobId = getJobNo?.id || null;

        if (jobId === null) {
            return res.status(400).json(validationError("Failed to create or fetch job"));
        }

        const workOrder = await prisma.workOrder.create({
            data: {
                workOrderPlaceDate: workOrderPlaceDate || new Date().toISOString(),
                workOrderNo,
                month,
                styleNo,
                lotNo,
                jobNo,
                orderType,
                jobId,
                styleRequirementId: findStyleNo.id,
                compositions: {
                    createMany: {
                        data: compositions.map(({ composition, color, orderQty, workOrderQty, unitPrice }) => ({
                            composition,
                            color,
                            orderQty: Number(orderQty),
                            workOrderQty: Number(workOrderQty),
                            unitePrice: Number(unitPrice),
                        }))
                    }
                }
            }
        });

        if (!workOrder) {
            return res.status(500).json(errorResponse("Failed to save work order"));
        }

        res.status(201).json(successResponse(workOrder, "Work order created successfully"));
    } catch (error) {
        console.error("CreateNewJob error:", error);
        res.status(500).json(errorResponse("Failed to create job"));
    }
};