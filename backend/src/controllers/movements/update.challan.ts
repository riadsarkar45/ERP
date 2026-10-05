import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

interface DeliveryEdit {
  id: number | string;
  challanNo: number | string;
  deliveryQty: number | string;
  fromFactory?: string | null;
  toFactory?: string | null;
  deliveryMonth?: string | null;
  deliveryDate?: Date | string | null;
}

// Number("") is 0, so blanks must be rejected explicitly
const isNum = (v: unknown) =>
  v !== null &&
  v !== undefined &&
  String(v).trim() !== "" &&
  Number.isFinite(Number(v));

// Convert frontend YYYY-MM-DD into a Prisma-compatible DateTime
const parseDeliveryDate = (value: unknown): Date | undefined => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return undefined;
  }

  const raw = String(value).trim();

  // Frontend normally sends: YYYY-MM-DD
  const date = new Date(
    `${raw.slice(0, 10)}T00:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid deliveryDate: ${value}`);
  }

  return date;
};

export const editChallan = async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      message: "Unauthorized",
      type: "error",
    });
  }

  // Accept a bare array or { deliveries: [...] }
  const items: DeliveryEdit[] | undefined = Array.isArray(req.body)
    ? req.body
    : req.body?.deliveries;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Body must be a non-empty array",
      type: "error",
    });
  }

  // Validate required numeric fields
  if (
    !items.every(
      (i) =>
        isNum(i?.id) &&
        isNum(i?.challanNo) &&
        isNum(i?.deliveryQty)
    )
  ) {
    return res.status(400).json({
      message:
        "Each item needs a numeric id, challanNo and deliveryQty",
      type: "error",
    });
  }

  try {
    // One update per id inside a transaction:
    // all rows are saved or none are
    const updated = await prisma.$transaction(
      items.map((i) => {
        const from = i.fromFactory?.trim();
        const to = i.toFactory?.trim();

        // Convert deliveryDate to Prisma DateTime
        const deliveryDate = parseDeliveryDate(i.deliveryDate);

        return prisma.deliveries.update({
          where: {
            id: Number(i.id),
          },

          data: {
            challanNo: Number(i.challanNo),
            deliveryQty: Number(i.deliveryQty),

            // deliveryMonth is a STRING
            ...(i.deliveryMonth != null
              ? {
                  deliveryMonth: String(i.deliveryMonth).trim(),
                }
              : {}),

            // deliveryDate is a Prisma DateTime
            ...(deliveryDate
              ? {
                  deliveryDate,
                }
              : {}),

            // Blank factory = leave unchanged
            ...(from
              ? {
                  fromFactory: from,
                }
              : {}),

            ...(to
              ? {
                  toFactory: to,
                }
              : {}),
          },
        });
      })
    );

    return res.status(200).json({
      message: "Deliveries updated",
      type: "success",
      updated,
    });
  } catch (err) {
    console.error("editChallan error", {
      userId,
      error: err,
    });

    // Prisma record not found
    if ((err as { code?: string })?.code === "P2025") {
      return res.status(404).json({
        message:
          "A delivery no longer exists. Reload the challan and try again.",
        type: "error",
      });
    }

    return res.status(400).json({
      message:
        err instanceof Error ? err.message : "Update failed",
      type: "error",
    });
  }
};