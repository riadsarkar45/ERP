import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
export const createNewOrder = async (req: Request, res: Response) => {
    // res.send({ message: "request received" })
    const {
        workOrderPlaceDate,
        workOrderNo,
        month,
        salesContractNo,
        buyer,
        jobNo,
        poNo,
        style,
        color,
        composition,
        processLoss,
        orderType,
        factoryName,
        orderQTY
    } = req.body as {
        workOrderPlaceDate: string,
        workOrderNo: string,
        month: string,
        salesContractNo: string,
        buyer: string,
        jobNo: string,
        poNo: string,
        style: string,
        color: string,
        composition: string,
        processLoss: string,
        orderType: string,
        factoryName: string,
        orderQTY: string,
    };
    console.log(req.body);
    if (!orderQTY || !workOrderNo || !jobNo || !workOrderPlaceDate || !salesContractNo || !poNo || !buyer || !style || !color || !composition || !processLoss || !orderType || !month || !workOrderNo) {
        console.log("empty detected");
        return res.status(400).send({ message: "All fields are required", type: "error" })
    }

    try {
        await prisma.$transaction(async (tx) => {

            const findFactoryName = await tx.factory.findUnique({
                where: { factoryName: factoryName }
            })
            const findJob = await tx.job.findUnique({
                where: { jobNo: jobNo }
            })
            let id = findJob?.id; // job id from @findJob
            let factoryId = findFactoryName?.id

            if (!findFactoryName) {
                const newFactory = await tx.factory.create(
                    {
                        data: {
                            jobId: Number(id),
                            factoryName: factoryName
                        }
                    }
                )

                factoryId = newFactory.id
            }else {
                factoryId = findFactoryName.id
            }
            const job = await tx.job.create({
                data: {
                    month: month,
                    buyer: buyer,
                    poNo: poNo,
                    style: style,
                    jobNo: jobNo,
                    factoryId: factoryId
                    
                }
            })
            const jobId = job.id





            await tx.workOrder.create(
                {
                    data: {
                        jobNo: jobNo,
                        workOrderPlaceDate: new Date(workOrderPlaceDate),
                        workOrderNo: workOrderNo,
                        composition: composition,
                        orderType: orderType,
                        processLossAfterYD: processLoss,
                        bookingColor: color,
                        salesContractNo: salesContractNo,
                        orderQty: orderQTY,
                        factoryId: Number(factoryId),
                    }
                }
            )
        }, {
            timeout: 15000
        })
        return res.status(201).send({ message: "Data saved", type: "success" })
    } catch (e) {
        console.log(e);
    }

}