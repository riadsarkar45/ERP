import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const updateOrders = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const dataToUpdate = req.body;
        const { date, challanNo } = req.body;
        if (!dataToUpdate || Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ type: "error", message: "No data provided to update" });
        }

        if (!orderId) {
            return res.status(400).json({ type: "error", message: "No id provided" });
        }

        const updateFieldArray = ["yarnReturnReceived", "greyReceivedFromYd", "yarnDeliveryForYD", "finishYarnReceived", "challanNo"];
        const dataFields = Object.keys(dataToUpdate)
        const matchedFields = updateFieldArray.filter((field) => dataFields.includes(field))

        const stringifiedData = Object.fromEntries(
            Object.entries(dataToUpdate).map(([key, value]) => [
                key,
                value !== null && value !== undefined ? String(value) : null
            ])
        );
        console.log(stringifiedData);
        const matchedData = Object.fromEntries(
            matchedFields.map((field) => [field, stringifiedData[field]])
        )



        await prisma.$transaction(async (tx) => {

            const checkJobId = await tx.deliveries.findUnique(
                {
                    where: { jobId: Number(orderId) }
                }
            )
            await tx.workOrder.update(
                {
                    where: { id: Number(orderId) },
                    data: {
                        ...stringifiedData,
                        date: new Date()
                    }
                }
            )
            if (!checkJobId) {
                await tx.deliveries.create(
                    {
                        data: {
                            ...matchedData,
                            jobId: Number(orderId),
                            challanNo: Number(challanNo),
                            deliveryDate: new Date(date)
                        }
                    }
                )
                // return newRecord
            }

            if (checkJobId) {

                if (matchedFields.length > 0) {

                    await tx.deliveries.upsert({
                        where: { jobId: Number(orderId) },
                        update: {
                            ...matchedData,
                            jobId: Number(orderId),
                            challanNo: Number(challanNo),
                            deliveryDate: new Date(date)
                        },
                        create: {
                            ...matchedData,
                            jobId: Number(orderId),
                            challanNo: Number(challanNo),
                            deliveryDate: new Date(date)
                        }
                    });



                }
            }
        }, {
            timeout: 15000,
            maxWait: 15000
        })

        return res.status(200).json({ type: "success" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};