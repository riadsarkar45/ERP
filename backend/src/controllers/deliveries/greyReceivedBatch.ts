import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";
import { challanValidation } from "../../helpers/challanValidation/challanValidation";
import { getIO } from "../../middleware/socket.io/socket";
import { generatePdfChallan } from "./generatePdfChallan";

interface GreyReceivedAllocation {
  yarnId: number;
  workOrderId: number;
  qty: number;
  lotNo?: string;
  piId?: string;
}

export const createGreyReceivedBatch = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.user?.userId);
    if (!req.user || !Number.isInteger(userId)) {
      return res.status(401).json({ type: "error", message: "Unauthorized" });
    }

    const {
      deliveryType,
      date,
      challanNo,
      fromFactory,
      toFactory,
      deliveryQty,
      allocations,
    } = req.body as {
      deliveryType?: string;
      date?: string;
      challanNo?: number | string;
      fromFactory?: string;
      toFactory?: string;
      deliveryQty?: number;
      allocations?: GreyReceivedAllocation[];
    };

    if (deliveryType !== "Grey Received") {
      return res.status(400).json({ type: "error", message: "This endpoint only accepts Grey Received." });
    }
    if (!date || !challanNo || !fromFactory || !toFactory || !Array.isArray(allocations) || allocations.length < 2) {
      return res.status(400).json({ type: "error", message: "Missing batch delivery details or allocations." });
    }

    const challanNoNum = Number(challanNo);
    const totalQty = Number(deliveryQty);
    const deliveryDate = new Date(date);
    if (!Number.isInteger(challanNoNum) || challanNoNum <= 0 || !Number.isFinite(totalQty) || totalQty <= 0 || Number.isNaN(deliveryDate.getTime())) {
      return res.status(400).json({ type: "error", message: "Invalid challan number, quantity, or date." });
    }

    const normalized = allocations.map((item) => ({
      yarnId: Number(item.yarnId),
      workOrderId: Number(item.workOrderId),
      qty: Number(item.qty),
      lotNo: String(item.lotNo ?? ""),
      piId: String(item.piId ?? ""),
    }));

    if (normalized.some((item) =>
      !Number.isInteger(item.yarnId) || item.yarnId <= 0 ||
      !Number.isInteger(item.workOrderId) || item.workOrderId <= 0 ||
      !Number.isFinite(item.qty) || item.qty <= 0
    )) {
      return res.status(400).json({ type: "error", message: "Every allocation must contain valid composition, work order, and positive quantity values." });
    }

    const allocatedQty = normalized.reduce((sum, item) => sum + item.qty, 0);
    if (Math.abs(allocatedQty - totalQty) > 0.01) {
      return res.status(400).json({ type: "error", message: "Allocation total does not match the submitted Grey Received quantity." });
    }

    const compositionIds = normalized.map((item) => item.yarnId);
    if (new Set(compositionIds).size !== compositionIds.length) {
      return res.status(400).json({ type: "error", message: "Duplicate composition allocations are not allowed." });
    }

    const compositions = await prisma.composition.findMany({
      where: { id: { in: compositionIds } },
      select: {
        id: true,
        workOrderId: true,
        composition: true,
        color: true,
        orderType: true,
        workOrderQty: true,
        deliveries: {
          select: { deliveryType: true, deliveryQty: true },
        },
        workOrder: { select: { id: true, orderType: true, factoryName: true } },
      },
    });

    if (compositions.length !== normalized.length) {
      return res.status(404).json({ type: "error", message: "One or more selected compositions could not be found." });
    }

    const compositionById = new Map(compositions.map((item) => [item.id, item]));
    for (const allocation of normalized) {
      const composition = compositionById.get(allocation.yarnId);
      if (!composition || composition.workOrderId !== allocation.workOrderId ||
          composition.orderType !== "dyeingOrder" || composition.workOrder.orderType !== "dyeingOrder") {
        return res.status(400).json({ type: "error", message: "An allocation does not belong to the specified dyeing work order." });
      }
    }

    // Recalculate each composition's outstanding quantity on the server;
    // never trust client-side proportional allocations alone.
    for (const allocation of normalized) {
      const composition = compositionById.get(allocation.yarnId)!;
      let totalOutbound = 0;
      let totalReturn = 0;
      for (const delivery of composition.deliveries) {
        const type = String(delivery.deliveryType || "");
        const lower = type.toLowerCase();
        const qty = Number(delivery.deliveryQty || 0);
        if (lower.includes("return")) totalReturn += qty;
        else if (lower.includes("delivery") || lower.includes("sent")) totalOutbound += qty;
      }
      const outstanding = Math.max(0, Number(composition.workOrderQty || 0) + totalReturn - totalOutbound);
      if (allocation.qty - outstanding > 0.01) {
        return res.status(409).json({
          type: "error",
          message: `Allocation for composition ID ${allocation.yarnId} exceeds its outstanding quantity (${outstanding} kg).`,
        });
      }
    }

    const identity = (value: string) => value.trim().toLowerCase();
    const firstComposition = compositions[0];
    if (compositions.some((item) =>
      identity(item.composition) !== identity(firstComposition.composition) ||
      identity(item.color) !== identity(firstComposition.color)
    )) {
      return res.status(400).json({ type: "error", message: "Grey Received batch allocations must belong to the same composition and color." });
    }

    const validations = await Promise.all(normalized.map(async (allocation) => {
      const result = await challanValidation(
        challanNoNum,
        String(allocation.workOrderId),
        toFactory,
        fromFactory,
        allocation.yarnId,
        deliveryType
      );
      return { allocation, result };
    }));

    const failures = validations.filter((item) => !item.result.success);
    if (failures.length) {
      return res.status(409).json({
        type: "error",
        message: "Grey Received batch validation failed. Nothing was saved.",
        deliveries: failures.map(({ allocation, result }) => ({
          yarnId: allocation.yarnId,
          workOrderId: allocation.workOrderId,
          message: result.message,
        })),
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const challan = await tx.challan.upsert({
        where: {
          challanNo_toFactory_fromFactory: {
            challanNo: challanNoNum,
            toFactory,
            fromFactory,
          },
        },
        update: {},
        create: { challanNo: challanNoNum, challanDate: deliveryDate, toFactory, fromFactory },
        select: { id: true },
      });

      const records = await Promise.all(normalized.map((allocation) =>
        tx.deliveries.create({
          data: {
            deliveryDate,
            deliveryMonth: deliveryDate.toLocaleString("en-US", { month: "long" }),
            challanNo: challanNoNum,
            challanId: challan.id,
            deliveryQty: allocation.qty,
            deliveryType,
            yarnId: allocation.yarnId,
            fromFactory,
            toFactory,
            yarnCompId: allocation.yarnId,
            createdBy: userId,
            lotNo: allocation.lotNo,
            piId: allocation.piId,
          } satisfies Prisma.deliveriesUncheckedCreateInput,
          select: { id: true, yarnId: true, deliveryQty: true },
        })
      ));

      return { challanId: challan.id, records };
    });

    for (const record of created.records) {
      Promise.resolve(generatePdfChallan(record.yarnId, record.id, userId)).catch((error: unknown) =>
        console.error("Grey Received batch PDF generation failed:", error)
      );
    }

    try {
      getIO()?.emit("delivery:created", {
        challanId: created.challanId,
        deliveryType,
        count: created.records.length,
        deliveries: created.records,
      });
    } catch (error) {
      console.error("Grey Received batch socket event failed:", error);
    }

    return res.status(200).json({
      type: "success",
      message: "Grey Received quantity distributed and saved successfully.",
      data: created.records,
      meta: { recordsCreated: created.records.length, allocatedQty },
    });
  } catch (error) {
    console.error("createGreyReceivedBatch failed:", error);
    return res.status(500).json({ type: "error", message: "Internal server error" });
  }
};
