// src/controllers/yarns/yarn.movement.ts
import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";

/* -------------------------------- Types -------------------------------- */

interface MovementInput {
  challanNo: number;
  quantity: number;
  date: Date;
  deliveryType: string;
}

interface UpdateInput {
  id: number;
  changes: Partial<MovementInput>;
}

interface ItemInput {
  compositionId: number; // = yarnPoItems.id
  added: MovementInput[];
  updated: UpdateInput[];
  removed: number[];
}

interface NewYarnMovementInput {
  piNo: string;
  items: ItemInput[];
}

type ValidationResult =
  | { ok: true; data: NewYarnMovementInput }
  | { ok: false; errors: string[] };

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ----------------------------- Validation ----------------------------- */

const MAX_INT32 = 2147483647; // Prisma Int limit

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const toPositiveInt = (v: unknown): number | null => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= MAX_INT32 ? n : null;
};

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
};

const asArray = (v: unknown): any[] => (Array.isArray(v) ? v : []);

const validateBody = (body: any): ValidationResult => {
  const errors: string[] = [];

  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Request body is required"] };
  }
  if (!isNonEmptyString(body.piNo)) errors.push("piNo is required");

  if (!Array.isArray(body.items) || body.items.length === 0) {
    errors.push("items must be a non-empty array");
    return { ok: false, errors };
  }

  const items: ItemInput[] = [];

  body.items.forEach((raw: any, i: number) => {
    const p = `items[${i}]`;

    const compositionId = toPositiveInt(raw?.compositionId);
    if (compositionId === null) {
      errors.push(
        `${p}.compositionId must be a positive integer (received: ${JSON.stringify(raw?.compositionId)})`
      );
    }

    /* ---- added ---- */
    const added: MovementInput[] = [];
    asArray(raw?.added).forEach((m: any, j: number) => {
      const path = `${p}.added[${j}]`;
      const challanNo = toPositiveInt(m?.challanNo);
      const quantity = Number(m?.quantity);
      const date = toDate(m?.date);

      if (challanNo === null) errors.push(`${path}.challanNo must be a whole number`);
      if (!Number.isFinite(quantity) || quantity <= 0) errors.push(`${path}.quantity must be greater than 0`);
      if (!date) errors.push(`${path}.date is invalid`);
      if (!isNonEmptyString(m?.deliveryType)) errors.push(`${path}.deliveryType is required`);

      if (challanNo !== null && date) {
        added.push({
          challanNo,
          quantity,
          date,
          deliveryType: String(m.deliveryType ?? "").trim(),
        });
      }
    });

    /* ---- updated ---- */
    const updated: UpdateInput[] = [];
    asArray(raw?.updated).forEach((u: any, j: number) => {
      const path = `${p}.updated[${j}]`;
      const id = toPositiveInt(u?.id);
      if (id === null) {
        errors.push(`${path}.id must be a positive integer`);
        return;
      }

      const c = u?.changes ?? {};
      const changes: Partial<MovementInput> = {};

      if (c.challanNo !== undefined) {
        const n = toPositiveInt(c.challanNo);
        if (n === null) errors.push(`${path}.changes.challanNo must be a whole number`);
        else changes.challanNo = n;
      }
      if (c.quantity !== undefined) {
        const q = Number(c.quantity);
        if (!Number.isFinite(q) || q <= 0) errors.push(`${path}.changes.quantity must be greater than 0`);
        else changes.quantity = q;
      }
      if (c.date !== undefined) {
        const d = toDate(c.date);
        if (!d) errors.push(`${path}.changes.date is invalid`);
        else changes.date = d;
      }
      if (c.deliveryType !== undefined) {
        if (!isNonEmptyString(c.deliveryType)) errors.push(`${path}.changes.deliveryType cannot be empty`);
        else changes.deliveryType = c.deliveryType.trim();
      }

      if (Object.keys(changes).length === 0) {
        errors.push(`${path}.changes has no valid fields`);
        return;
      }
      updated.push({ id, changes });
    });

    /* ---- removed ---- */
    const removed: number[] = [];
    asArray(raw?.removed).forEach((r: any, j: number) => {
      const id = toPositiveInt(r);
      if (id === null) errors.push(`${p}.removed[${j}] must be a positive integer`);
      else removed.push(id);
    });

    if (!added.length && !updated.length && !removed.length) {
      errors.push(`${p} must contain at least one of added, updated or removed`);
    }

    if (compositionId !== null) {
      items.push({ compositionId, added, updated, removed });
    }
  });

  if (errors.length > 0) return { ok: false, errors };

  return { ok: true, data: { piNo: body.piNo.trim(), items } };
};

/* ------------------------------- Handler ------------------------------ */

export const newYarnMovement = async (req: Request, res: Response) => {
  const validation = validateBody(req.body);

  if (!validation.ok) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validation.errors,
    });
  }

  const { piNo, items } = validation.data;

  try {
    // 1. Find the PO by PI number
    const yarnPo = await prisma.yarnPoModel.findFirst({
      where: { piNo },
      select: { id: true },
    });

    if (!yarnPo) {
      throw new HttpError(404, `Yarn PO not found for PI No: ${piNo}`);
    }

    // 2. Every compositionId must be an item of this PO
    const poItems = await prisma.yarnPoItems.findMany({
      where: { yarnPoId: yarnPo.id },
      select: { id: true },
    });
    const validItemIds = new Set(poItems.map((x: any) => x.id));
    const invalidIds = [
      ...new Set(
        items.map((x) => x.compositionId).filter((id) => !validItemIds.has(id))
      ),
    ];

    if (invalidIds.length > 0) {
      throw new HttpError(
        400,
        `compositionId [${invalidIds.join(", ")}] is not a yarn item of PI No: ${piNo}. ` +
          `Valid item ids: [${[...validItemIds].join(", ")}]`
      );
    }

    // 3. Apply everything atomically
    const summary = await prisma.$transaction(async (tx: any) => {
      let added = 0;
      let updated = 0;
      let removed = 0;

      for (const item of items) {
        if (item.added.length) {
          const result = await tx.spinningYarnMovement.createMany({
            data: item.added.map((m) => ({
              yarnPoItemsId: item.compositionId,
              movementType: m.deliveryType,
              movementDate: m.date,
              movementQty: m.quantity,
              challanNo: m.challanNo,
            })),
          });
          added += result.count;
        }

        for (const u of item.updated) {
          const data: Prisma.spinningYarnMovementUpdateManyMutationInput = {};
          if (u.changes.challanNo !== undefined) data.challanNo = u.changes.challanNo;
          if (u.changes.quantity !== undefined) data.movementQty = u.changes.quantity;
          if (u.changes.date !== undefined) data.movementDate = u.changes.date;
          if (u.changes.deliveryType !== undefined) data.movementType = u.changes.deliveryType;

          // Scoped by yarnPoItemsId so a challan from another PO can't be touched
          const result = await tx.spinningYarnMovement.updateMany({
            where: { id: u.id, yarnPoItemsId: item.compositionId },
            data,
          });
          if (result.count !== 1) {
            throw new HttpError(404, `Challan ${u.id} not found under item ${item.compositionId}`);
          }
          updated += 1;
        }

        if (item.removed.length) {
          const result = await tx.spinningYarnMovement.deleteMany({
            where: {
              id: { in: item.removed },
              yarnPoItemsId: item.compositionId,
            },
          });
          removed += result.count;
        }
      }

      return { added, updated, removed };
    });

    return res.status(200).json({
      success: true,
      message: "Challans saved successfully",
      data: { piNo, ...summary },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    console.error("[newYarnMovement] Error:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: error.code,
        meta: error.meta,
      });
    }

    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};