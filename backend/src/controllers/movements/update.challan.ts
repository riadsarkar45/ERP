import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

// ── Column mapping ──────────────────────────────────────────────────
// challanNo, fromFactory, toFactory, deliveryQty are real columns on `deliveries`.
//
// Every field below is NOT a column — each is a UI-side bucket derived from
// this record's single `deliveryQty`, split out by `deliveryType`. Three
// screens (Knitting, Aop, Dyeing) each use their own bucket names for the
// same underlying pattern. Since one `deliveries` row has exactly one
// `deliveryType`, whichever single bucket the client sends maps to THIS
// record's `deliveryQty`.
//
// unitePrice is NOT a column on `deliveries` (confirmed against schema.prisma)
// and is rejected below. Dyeing and Knitting UIs currently let users edit it —
// those edits will always 400 until price has a real home in the schema.

const DIRECT_STRING_FIELDS = ["fromFactory", "toFactory"] as const;

const QTY_BUCKET_FIELDS = [
  // Knitting
  "yarnDelivery",
  "yarnReturn",
  "greyFabricReceived",
  // Aop
  "sentForAop",
  "returnFromAop",
  "receiveFromAop",
  "finishReceiveFromAop",
  // Dyeing
  "greyDelivery",
  "greyReturn",
  "greyReceive",
  "finishReceive",
] as const;

type DirectStringField = (typeof DIRECT_STRING_FIELDS)[number];
type QtyBucketField = (typeof QTY_BUCKET_FIELDS)[number];

interface DeliveryEditItem {
  deliveryId: number | string;
  challanNo?: number | string;
  fromFactory?: string;
  toFactory?: string;
  unitePrice?: number | string;
  [key: string]: unknown; // qty bucket fields + other UI-only fields (rowKey, etc.)
}

const toValidNumber = (val: unknown): number | null => {
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

export const editChallan = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized", type: "error" });
  }

  const items: DeliveryEditItem[] = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Body must be a non-empty array", type: "error" });
  }

  const updates: { deliveryId: number; data: Record<string, unknown> }[] = [];

  for (const item of items) {
    const deliveryId = Number(item.deliveryId);
    if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
      return res.status(400).json({
        message: `Invalid deliveryId in payload: ${JSON.stringify(item)}`,
        type: "error",
      });
    }

    if (item.unitePrice !== undefined) {
      return res.status(400).json({
        message: `unitePrice cannot be saved for deliveryId ${deliveryId}: it is not a column on deliveries. Confirm where price should be stored before enabling this field in the UI.`,
        type: "error",
      });
    }

    const data: Record<string, unknown> = {};

    // ── challanNo ──
    if (item.challanNo !== undefined) {
      const num = Number(item.challanNo);
      if (!Number.isInteger(num)) {
        return res.status(400).json({
          message: `Invalid challanNo for deliveryId ${deliveryId}: "${item.challanNo}"`,
          type: "error",
        });
      }
      data.challanNo = num;
    }

    // ── fromFactory / toFactory ──
    for (const field of DIRECT_STRING_FIELDS as readonly DirectStringField[]) {
      if (item[field] === undefined) continue;
      const str = typeof item[field] === "string" ? (item[field] as string).trim() : "";
      if (!str) {
        return res.status(400).json({
          message: `Invalid ${field} for deliveryId ${deliveryId}`,
          type: "error",
        });
      }
      data[field] = str;
    }

    // ── quantity buckets (any screen) → single deliveryQty column ──
    // Each `deliveries` row has exactly one deliveryType, so exactly one
    // bucket should be relevant per record. Reject rather than guess if
    // more than one arrives for the same row.
    const sentBuckets = (QTY_BUCKET_FIELDS as readonly QtyBucketField[]).filter(
      (f) => item[f] !== undefined
    );

    if (sentBuckets.length > 1) {
      return res.status(400).json({
        message: `Cannot resolve quantity edit for deliveryId ${deliveryId}: multiple quantity fields (${sentBuckets.join(
          ", "
        )}) were edited on a row that maps to a single delivery record. Edit one quantity field per row.`,
        type: "error",
      });
    }

    if (sentBuckets.length === 1) {
      const bucketField = sentBuckets[0]!;
      const qty = toValidNumber(item[bucketField]);
      if (qty === null || qty < 0) {
        return res.status(400).json({
          message: `Invalid ${bucketField} for deliveryId ${deliveryId}: "${item[bucketField]}"`,
          type: "error",
        });
      }
      data.deliveryQty = qty;
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    updates.push({ deliveryId, data });
  }

  if (updates.length === 0) {
    return res.status(400).json({
      message: "No updatable fields found in payload.",
      type: "error",
    });
  }

  try {
    const results = await Promise.all(
      updates.map(({ deliveryId, data }) =>
        prisma.deliveries.update({
          where: { id: deliveryId },
          data,
        })
      )
    );

    return res.status(200).json({
      message: "Deliveries updated",
      type: "success",
      updated: results,
    });
  } catch (err) {
    console.error("editChallan error", { userId, error: err });
    return res.status(400).json({
      message: err instanceof Error ? err.message : "Update failed",
      type: "error",
    });
  }
};