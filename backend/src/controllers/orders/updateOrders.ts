import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const updateOrders = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        console.log(orderId);
        const dataToUpdate = req.body;

        if (!dataToUpdate || Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ type: "error", message: "No data provided to update" });
        }

        if (!orderId) {
            return res.status(400).json({ type: "error", message: "No id provided" });
        }

        console.log(dataToUpdate);

        // ✅ Convert all values to string (Prisma schema expects String)
        const stringifiedData = Object.fromEntries(
            Object.entries(dataToUpdate).map(([key, value]) => [
                key,
                value !== null && value !== undefined ? String(value) : null
            ])
        );
        console.log("1", stringifiedData);
        const updatedWorkOrder = await prisma.workOrder.update({
            where: { id: Number(orderId) },  // ✅ dynamic id from params
            data: stringifiedData        // ✅ stringified data
        });
        console.log("2.", stringifiedData);
        return res.status(200).json({ type: "success", data: updatedWorkOrder });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};