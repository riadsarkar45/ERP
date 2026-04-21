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
        return res.status(400).send({ message: "All fields are required", type: "error" })
    }

    try {
        await prisma.$transaction(async (tx) => {

            const findFactoryName = await tx.factory.findUnique({
                where: { factoryName: factoryName }
            })
           

            
            let factoryId = findFactoryName?.id // @factoryId from @factory

     
           


            await tx.workOrder.create(
                {
                    data: {
                        jobNo: jobNo,
                        workOrderNo: workOrderNo,
                        composition: composition,
                        orderType: orderType,
                        bookingColor: color,
                        factoryId: Number(factoryId),
                        date: "2026-03-17T10:30:00.000Z"
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