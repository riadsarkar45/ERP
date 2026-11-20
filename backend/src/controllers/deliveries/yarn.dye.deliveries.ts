import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";
import { challanValidation } from "../../helpers/challanValidation/challanValidation";
import { getIO } from "../../middleware/socket.io/socket";
import { generatePdfChallan } from "./generatePdfChallan";

interface DeliveryItem {
    deliveryType: string;
    qty: number;
}

interface YarnDyeItem {
    yarnId: number | string; // YarnColorBooking.id
    workOrderId?: number | string;
    toFactory: string;
    fromFactory: string;
    date: string;
    challanNo: number | string;
    lotNo?: string | null;
    piId?: string | null;
    deliveries: DeliveryItem[];
}

const ALLOWED_TYPES = new Set([
    "Yarn Delivery For Yarn Dye",
    "Yarn Return From Yarn Dye",
    "Yarn Received From Yarn Dye",
    "Finish Received",
    "Finish Return",
]);

const MAX_ITEMS = 100;

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) return;
    io.emit(event, payload);
};

export const yarnDyeDeliveries = async (req: Request, res: Response) => {
    const requestStart = process.hrtime.bigint();

    try {
        const userId = Number(req.user?.userId);
        if (!req.user || !Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({ type: "error", message: "Unauthorized" });
        }

        const items = (req.body as { items?: YarnDyeItem[] })?.items;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ type: "error", message: "No deliveries provided" });
        }
        if (items.length > MAX_ITEMS) {
            return res.status(400).json({ type: "error", message: `Too many items (max ${MAX_ITEMS})` });
        }

        // ---------- 1. validate the shape of every item ----------
        const errors: { yarnId: unknown; message: string }[] = [];
        const seenYarnIds = new Set<number>();

        const parsed = items.map((item) => {
            const yarnId = Number(item?.yarnId);
            const challanNo = Number(item?.challanNo);
            const date = new Date(item?.date);
            const toFactory = String(item?.toFactory ?? "").trim();
            const fromFactory = String(item?.fromFactory ?? "").trim();
            const deliveries = Array.isArray(item?.deliveries) ? item.deliveries : [];

            const fail = (message: string) => errors.push({ yarnId: item?.yarnId, message });

            if (!Number.isInteger(yarnId) || yarnId <= 0) fail("Invalid yarn color booking ID");
            else if (seenYarnIds.has(yarnId)) fail("Same yarn color sent twice");
            else seenYarnIds.add(yarnId);

            if (!toFactory || !fromFactory) fail("To Factory and From Factory are required");
            if (!Number.isInteger(challanNo) || challanNo <= 0) fail("Invalid challan number");
            if (Number.isNaN(date.getTime())) fail("Invalid delivery date");
            if (deliveries.length === 0) fail("No delivery entries");

            for (const d of deliveries) {
                if (
                    !d ||
                    typeof d.deliveryType !== "string" ||
                    !ALLOWED_TYPES.has(d.deliveryType) ||
                    !Number.isFinite(Number(d.qty)) ||
                    Number(d.qty) <= 0
                ) {
                    fail("Invalid delivery type or quantity");
                    break;
                }
            }

            return {
                yarnId,
                queryWorkOrderId: item?.workOrderId ? Number(item.workOrderId) : null,
                toFactory,
                fromFactory,
                date,
                challanNo,
                lotNo: item?.lotNo ?? null,
                piId: item?.piId ?? null,
                deliveries,
            };
        });

        if (errors.length > 0) {
            return res.status(400).json({
                type: "error",
                message: "Invalid delivery data",
                errors,
            });
        }

        // ---------- 2. load all yarn color bookings at once ----------
        const bookings = await prisma.yarnColorBooking.findMany({
            where: { id: { in: parsed.map((p) => p.yarnId) } },
            select: {
                id: true,
                compositionId: true,
                composition: { select: { workOrderId: true } },
            },
        });
        const bookingMap = new Map(bookings.map((b) => [b.id, b]));

        const missing = parsed.filter((p) => !bookingMap.has(p.yarnId));
        if (missing.length > 0) {
            return res.status(404).json({
                type: "error",
                message: "Yarn color booking not found",
                errors: missing.map((m) => ({
                    yarnId: m.yarnId,
                    message: "Yarn color booking not found",
                })),
            });
        }

        const resolved = parsed.map((p) => {
            const booking = bookingMap.get(p.yarnId)!;
            return {
                ...p,
                compositionId: booking.compositionId,
                workOrderId: booking.composition.workOrderId ?? p.queryWorkOrderId,
            };
        });

        const noWorkOrder = resolved.filter((r) => !r.workOrderId);
        if (noWorkOrder.length > 0) {
            return res.status(400).json({
                type: "error",
                message: "Work order not found for a yarn color booking",
                errors: noWorkOrder.map((r) => ({
                    yarnId: r.yarnId,
                    message: "Work order not found for this yarn color booking",
                })),
            });
        }

        // ---------- 3. business validation (same rules as before), nothing saved yet ----------
        const failures: Record<string, unknown>[] = [];

        for (const r of resolved) {
            for (const d of r.deliveries) {
                const result = await challanValidation(
                    r.challanNo,
                    String(r.workOrderId),
                    r.toFactory,
                    r.fromFactory,
                    r.yarnId,
                    d.deliveryType
                );
                if (!result.success) {
                    failures.push({
                        yarnId: r.yarnId,
                        deliveryType: d.deliveryType,
                        ...result,
                    });
                }
            }
        }

        if (failures.length > 0) {
            return res.status(409).json({
                type: "error",
                message: "One or more delivery validations failed",
                errors: failures,
            });
        }

        // ---------- 4. save EVERYTHING in one transaction (all or nothing) ----------
        const dbWriteStart = process.hrtime.bigint();

        const saved = await prisma.$transaction(
            async (tx) => {
                const challanCache = new Map<string, number>();
                const out: { yarnId: number; compositionId: number; workOrderId: number; challanId: number; ids: number[] }[] = [];

                for (const r of resolved) {
                    const key = `${r.challanNo}|${r.toFactory}|${r.fromFactory}`;
                    let challanId = challanCache.get(key);

                    if (challanId === undefined) {
                        const existing = await tx.challan.findUnique({
                            where: {
                                challanNo_toFactory_fromFactory: {
                                    challanNo: r.challanNo,
                                    toFactory: r.toFactory,
                                    fromFactory: r.fromFactory,
                                },
                            },
                            select: { id: true },
                        });

                        challanId = existing
                            ? existing.id
                            : (
                                await tx.challan.create({
                                    data: {
                                        challanNo: r.challanNo,
                                        challanDate: r.date,
                                        toFactory: r.toFactory,
                                        fromFactory: r.fromFactory,
                                    },
                                    select: { id: true },
                                })
                            ).id;

                        challanCache.set(key, challanId);
                    }

                    const ids: number[] = [];
                    for (const d of r.deliveries) {
                        const data: Prisma.deliveriesUncheckedCreateInput = {
                            deliveryDate: r.date,
                            deliveryMonth: r.date.toLocaleString("en-US", { month: "long" }),
                            challanNo: r.challanNo,
                            challanId,
                            deliveryQty: Number(d.qty),
                            deliveryType: d.deliveryType,
                            yarnId: r.yarnId,              // YarnColorBooking.id
                            yarnCompId: r.compositionId,   // Composition.id
                            toFactory: r.toFactory,
                            fromFactory: r.fromFactory,
                            createdBy: userId,
                            lotNo: r.lotNo,
                            piId: r.piId,
                        };
                        const created = await tx.deliveries.create({ data, select: { id: true } });
                        ids.push(created.id);
                    }

                    out.push({
                        yarnId: r.yarnId,
                        compositionId: r.compositionId,
                        workOrderId: Number(r.workOrderId),
                        challanId,
                        ids,
                    });
                }

                return out;
            },
            { timeout: 30000, maxWait: 10000 }
        );

        const dbWriteMs = Number(process.hrtime.bigint() - dbWriteStart) / 1_000_000;

        // ---------- 5. after the commit: PDF + socket (never fail the request) ----------
        for (const s of saved) {
            const lastId = s.ids[s.ids.length - 1];
            if (lastId !== undefined) {
                Promise.resolve(generatePdfChallan(s.compositionId, lastId, userId)).catch((e: unknown) =>
                    console.error("generatePdfChallan failed:", e)
                );
            }
            try {
                emitProgress("delivery:created", {
                    challanId: s.challanId,
                    workOrderId: s.workOrderId,
                    yarnId: s.yarnId,
                    yarnCompId: s.compositionId,
                    count: s.ids.length,
                    deliveries: s.ids.map((id) => ({ id })),
                    dbWriteMs,
                });
            } catch (e) {
                console.error("emitProgress failed:", e);
            }
        }

        const totalMs = Number(process.hrtime.bigint() - requestStart) / 1_000_000;

        return res.status(200).json({
            type: "success",
            message: `${saved.length} yarn color(s) delivered successfully`,
            data: saved.map((s) => ({ yarnId: s.yarnId, workOrderId: s.workOrderId, ids: s.ids })),
            meta: {
                colors: saved.length,
                recordsCreated: saved.reduce((n, s) => n + s.ids.length, 0),
                dbWriteMs: Math.round(dbWriteMs * 100) / 100,
                totalMs: Math.round(totalMs * 100) / 100,
            },
        });
    } catch (error) {
        console.error("yarnDyeDeliveries error:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.error("Prisma error code:", error.code);
        }
        return res.status(500).json({ type: "error", message: "Internal server error" });
    }
};