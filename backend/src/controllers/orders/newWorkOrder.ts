import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { checkDataExist } from "../../utils/checkIfDataExist";

export const createNewJob = async (req: Request, res: Response) => {
    const {
        compositions,
        orderType
    } = req.body as {
        compositions: {
            composition: string;
            color: string;
            workOrderQty: string;
            orderQty: string;
            unitPrice: string;
            yarnColors?: { color: string; qty: string }[];
        }[];
        orderType: string;
    };

    console.log(req.body);

    try {
        // jobNo is the unique key on StyleRequirement — use that instead of styleNo,
        // which is not guaranteed unique and can match the wrong row.
        const findStyleRequirement = await prisma.styleRequirement.findUnique({
            where: { jobNo: req.body.jobNo }
        });

        if (!findStyleRequirement) {
            return res.status(400).send({ message: "Style requirement not found for this job no", type: "error" });
        }

        const getJobNo = await checkDataExist(req.body.jobNo);
        const jobId = getJobNo?.id || null;

        if (jobId === null) {
            return res.status(400).send({ message: "Job no is missing", type: "error" });
        }

        const workOrder = await prisma.workOrder.create({
            data: {
                workOrderPlaceDate: req.body.workOrderPlaceDate,
                workOrderNo: req.body.workOrderNo,
                month: req.body.month,
                styleNo: req.body.styleNo,
                lotNo: req.body.lotNo,
                jobNo: req.body.jobNo,
                factoryName: req.body.factoryName,
                orderType,
                jobId,
                styleRequirementId: findStyleRequirement.id, // now actually linked
                compositions: {
                    createMany: {
                        data: compositions.map(({ composition, color, orderQty, workOrderQty, unitPrice }) => ({
                            composition,
                            color,
                            orderQty: Number(orderQty),
                            workOrderQty: Number(workOrderQty),
                            unitePrice: Number(unitPrice),
                            orderType: orderType
                        }))
                    }
                }
            }
        });

        if (!workOrder) {
            return res.status(500).send({ message: "Failed to save data", type: "error" });
        }

        if (orderType === "yarnDyeingOrder") {
            const yarnRows = compositions.flatMap(({ composition, yarnColors }) =>
                (yarnColors ?? []).map(({ color, qty }) => ({
                    color,
                    qty: Number(qty),
                    composition,
                    workOrderId: workOrder.id,
                }))
            );

            if (yarnRows.length > 0) {
                await prisma.yarnDyeingJobs.createMany({ data: yarnRows });
            }
        }

        return res.status(201).send({ message: "Data saved", type: "success" });
    } catch (e) {
        console.log(e);
        return res.status(500).send({ message: "Internal server error", type: "error" });
    }
};