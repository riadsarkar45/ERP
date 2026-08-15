import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { checkDataExist } from "../../utils/checkIfDataExist";

// ── Types ────────────────────────────────────────────────────────────────────
type YarnColorInput = { color: string; qty: string | number; price: string | number };

type CompositionInput = {
    composition: string;
    color: string;
    orderQty?: string | number;
    workOrderQty?: string | number;
    unitPrice?: string | number;
    machineDia?: string;
    yarnCount?: string;
    stichLength?: string;
    lotNo?: string;
    yarnColors?: YarnColorInput[];
};

type CreateJobBody = {
    workOrderPlaceDate: string;
    workOrderNo: string;
    month: string;
    salesContractNo?: string;
    buyer?: string;
    jobNo: string;
    poNo?: string;
    style?: string;
    styleNo?: string;
    orderType: string;
    factoryName: string;
    stichLength?: string;
    lotNo?: string;
    unitPrice?: string;
    yarnCount?: string;
    processLoss?: string;
    compositions: CompositionInput[];
};

// FIX: same shape/values as ORDER_TYPE_RULES in NewOrder.jsx. This is the
// single source of truth for "which WorkOrder-level field is required for
// which order type" — previously the backend had its own hand-written
// combination of `orderType !== "yarnDyeingOrder"`, `orderType === "knittingOrder"`,
// and `orderType === "knittingOrder" || orderType === "dyeingOrder"` checks
// that didn't match what the frontend showed/required (e.g. stichLength was
// required here for dyeingOrder, but the frontend didn't require it for
// dyeingOrder — so a blank Stich Length passed the frontend and 400'd here).
// Keep this object identical to the frontend's ORDER_TYPE_RULES.
const ORDER_TYPE_RULES: Record<string, { lotNo: boolean; yarnCount: boolean; stichLength: boolean; machineDia: boolean }> = {
    knittingOrder: { lotNo: true, yarnCount: true, stichLength: true, machineDia: true },
    aopOrder: { lotNo: true, yarnCount: true, stichLength: false, machineDia: false },
    dyeingOrder: { lotNo: true, yarnCount: true, stichLength: true, machineDia: false },
    yarnDyeingOrder: { lotNo: false, yarnCount: false, stichLength: false, machineDia: false },
};

const getRules = (orderType: string) =>
    ORDER_TYPE_RULES[orderType] ?? { lotNo: false, yarnCount: false, stichLength: false, machineDia: false };

const isInvalid = (v: unknown) =>
    v === "" || v === null || v === undefined || (typeof v === "string" && !v.trim());

const isInvalidNumber = (v: unknown) =>
    v === "" || v === null || v === undefined || isNaN(Number(v));

export const createNewJob = async (req: Request, res: Response) => {
    const {
        compositions,
        orderType,
        workOrderPlaceDate,
        workOrderNo,
        month,
        styleNo,
        style,
        jobNo,
        factoryName,
    } = req.body as CreateJobBody;

    try {
        // ── Basic required validation ─────────────────────────────────────
        if (!jobNo) return res.status(400).send({ message: "Job number is required", type: "error" });
        if (!orderType) return res.status(400).send({ message: "Order type is required", type: "error" });
        // FIX: reject unknown order types up front instead of silently falling
        // through with all-false rules (which would make every field optional
        // for a typo'd/unsupported orderType).
        if (!ORDER_TYPE_RULES[orderType]) {
            return res.status(400).send({ message: `Unknown order type: ${orderType}`, type: "error" });
        }
        if (!workOrderPlaceDate) return res.status(400).send({ message: "Work order place date is required", type: "error" });
        if (!workOrderNo) return res.status(400).send({ message: "Work order number is required", type: "error" });
        if (!month) return res.status(400).send({ message: "Month is required", type: "error" });
        if (!factoryName) return res.status(400).send({ message: "Factory name is required", type: "error" });

        if (!compositions || !Array.isArray(compositions) || compositions.length === 0) {
            return res.status(400).send({ message: "At least one composition is required", type: "error" });
        }

        // ── Extract WorkOrder-level fields from the first composition ─────
        // Frontend sends these per-row; schema stores them once on WorkOrder.
        const firstRow = compositions[0];
        const lotNo = firstRow?.lotNo || "";
        const yarnCount = firstRow?.yarnCount || "";
        const stichLength = firstRow?.stichLength || "";
        const machineDia = firstRow?.machineDia || "";

        // ── WorkOrder-level field validation ──────────────────────────────
        // FIX: driven by the shared rules table instead of a bespoke
        // `orderType !== "yarnDyeingOrder"` + per-field `orderType === "x"` checks.
        const rules = getRules(orderType);
        if (rules.lotNo && isInvalid(lotNo)) {
            return res.status(400).send({ message: "Lot No is required", type: "error" });
        }
        if (rules.yarnCount && isInvalid(yarnCount)) {
            return res.status(400).send({ message: "Yarn Count is required", type: "error" });
        }
        if (rules.machineDia && isInvalid(machineDia)) {
            return res.status(400).send({ message: "Machine Dia is required for knitting order", type: "error" });
        }
        if (rules.stichLength && isInvalid(stichLength)) {
            return res.status(400).send({ message: "Stich Length is required", type: "error" });
        }

        // ── Per-composition validation ────────────────────────────────────
        for (let i = 0; i < compositions.length; i++) {
            const comp = compositions[i];

            // orderQty is intentionally not required — it's not collected per
            // work order (see orderQty: 0 in the create() call below).
            if (!comp?.composition || !comp?.color) {
                return res.status(400).send({
                    message: `Composition ${i + 1}: composition and color are required`,
                    type: "error",
                });
            }

            if (orderType === "yarnDyeingOrder") {
                if (!Array.isArray(comp.yarnColors) || comp.yarnColors.length === 0) {
                    return res.status(400).send({
                        message: `Composition ${i + 1}: at least one yarn color is required for yarn dyeing order`,
                        type: "error",
                    });
                }
                for (let j = 0; j < comp.yarnColors.length; j++) {
                    const yc = comp.yarnColors[j];
                    if (!yc?.color || isInvalidNumber(yc?.qty) || isInvalidNumber(yc?.price)) {
                        return res.status(400).send({
                            message: `Composition ${i + 1}, Yarn Color ${j + 1}: color, valid qty and price are required`,
                            type: "error",
                        });
                    }
                }
            } else {
                // workOrderQty is the quantity that matters for non-yarn-dyeing orders
                if (isInvalidNumber(comp?.workOrderQty)) {
                    return res.status(400).send({
                        message: `Composition ${i + 1}: valid work order quantity is required`,
                        type: "error",
                    });
                }
                if (isInvalidNumber(comp?.unitPrice)) {
                    return res.status(400).send({
                        message: `Composition ${i + 1}: valid price per kg is required`,
                        type: "error",
                    });
                }
            }
        }

        // ── Lookups ───────────────────────────────────────────────────────
        const findStyleRequirement = await prisma.styleRequirement.findUnique({ where: { jobNo } });
        if (!findStyleRequirement) {
            return res.status(404).send({
                message: "Style requirement not found for this job number",
                type: "error",
            });
        }

        const jobRecord = await checkDataExist(jobNo);
        if (!jobRecord?.id) {
            return res.status(404).send({ message: "Job record not found", type: "error" });
        }
        const jobId = jobRecord.id;

        // ── Transactional create (WorkOrder + Compositions + YarnJobs) ────
        const workOrder = await prisma.$transaction(async (tx) => {
            const created = await tx.workOrder.create({
                data: {
                    // ── Top-level WorkOrder fields ──
                    workOrderPlaceDate,
                    workOrderNo,
                    month,
                    styleNo: styleNo || style || "",
                    lotNo,
                    jobNo,
                    factoryName,
                    orderType,
                    jobId,
                    styleRequirementId: findStyleRequirement.id,
                    // ── WorkOrder-level fields (extracted from row 0) ──
                    yarnCount,
                    stichLength,
                    machineDia,
                    // ── Compositions (per-row fields) ──
                    compositions: {
                        create: compositions.map((c) => ({
                            composition: c.composition,
                            color: c.color,
                            orderQty: 0, // not collected per work order — intentional
                            workOrderQty: c.workOrderQty ? Number(c.workOrderQty) : 0,
                            unitePrice: c.unitPrice ? Number(c.unitPrice) : 0,
                            orderType,
                        })),
                    },
                },
                include: { compositions: true },
            });

            // ── Yarn dyeing color rows ────────────────────────────────────
            if (orderType === "yarnDyeingOrder") {
                const yarnRows = compositions.flatMap((comp) =>
                    (comp.yarnColors ?? []).map((yc) => ({
                        color: yc.color,
                        qty: Number(yc.qty),
                        unitePrice: Number(yc.price),
                        composition: comp.composition,
                        workOrderId: created.id,
                    }))
                );

                if (yarnRows.length > 0) {
                    await tx.yarnDyeingJobs.createMany({ data: yarnRows });
                }
            }

            return created;
        });

        return res.status(201).send({
            message: "Work order created successfully",
            type: "success",
            data: {
                id: workOrder.id,
                workOrderNo: workOrder.workOrderNo,
                jobNo: workOrder.jobNo,
            },
        });
    } catch (e) {
        console.error("Error creating work order:", e);

        const code = (e as any)?.code;
        if (code === "P2002") {
            return res.status(409).send({
                message: "A work order with this number already exists",
                type: "error",
            });
        }
        if (code === "P2003") {
            return res.status(400).send({
                message: "Invalid reference data - please check your inputs",
                type: "error",
            });
        }

        return res.status(500).send({
            message: "Internal server error while creating work order",
            type: "error",
        });
    }
};