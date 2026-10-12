import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const joinDeliveries = async (req: Request, res: Response) => {
  try {
    const { jobNo } = req.params as { jobNo: string };

    if (!jobNo) {
      return res.status(400).send({ message: "Missing required fields", type: "error" });
    }

    const workOrderData = await prisma.jobs.findUnique({
      where: { jobNo },
      select: {
        workOrders: {
          where: { orderType: "dyeingOrder" },
          orderBy: { id: "asc" },
          select: {
            id: true,
            factoryName: true,
            orderType: true,
            compositions: {
              where: { orderType: "dyeingOrder" },
              orderBy: { id: "asc" },
              select: {
                id: true,
                orderType: true,
                composition: true,
                color: true,
                workOrderQty: true,
                // needed for Grey Delivery qty and Remaining qty
                deliveries: {
                  select: {
                    deliveryType: true,
                    deliveryQty: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return res.status(200).send(workOrderData ?? { workOrders: [] });
  } catch (error) {
    console.error("joinDeliveries failed:", error);
    return res.status(500).send({ message: "Internal server error", type: "error" });
  }
};