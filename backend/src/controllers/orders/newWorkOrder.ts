import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { checkDataExist } from "../../utils/checkIfDataExist";
import { evaluateQtyExpression } from "../newStyleRequirements/updateStyleRequires/evaluateQtyExpression";

type YarnColorInput = {
    color: string;
    shade?: string;
    yarnCount?: string;
    machineDia?: string;
    lotNo?: string;
    qty: string | number;
    price: string | number;
};

type CompositionInput = {
    // Optional: send this from the frontend if you already know the exact row
    styleRequirementRowId?: string | number;
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

const ORDER_TYPE_RULES: Record<
    string,
    { lotNo: boolean; yarnCount: boolean; stichLength: boolean; machineDia: boolean }
> = {
    knittingOrder: { lotNo: true, yarnCount: true, stichLength: true, machineDia: true },
    aopOrder: { lotNo: true, yarnCount: true, stichLength: false, machineDia: false },
    dyeingOrder: { lotNo: true, yarnCount: true, stichLength: true, machineDia: false },
    yarnDyeingOrder: { lotNo: false, yarnCount: false, stichLength: false, machineDia: false },
};

const DEFAULT_RULES = { lotNo: false, yarnCount: false, stichLength: false, machineDia: false };
const getRules = (orderType: string) => ORDER_TYPE_RULES[orderType] ?? DEFAULT_RULES;

const isInvalid = (v: unknown): boolean =>
    v === "" || v === null || v === undefined || (typeof v === "string" && !v.trim());

const toValidNumber = (v: unknown): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const evaluated = evaluateQtyExpression(String(v));
    const n = Number(evaluated);
    return Number.isNaN(n) ? null : n;
};

const normalize = (v: unknown): string => String(v ?? "").trim().toLowerCase();
const rowKey = (composition: unknown, color: unknown): string =>
    `${normalize(composition)}||${normalize(color)}`;

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
        const userId = Number(req.user?.userId);
        if (!req.user || Number.isNaN(userId)) {
            return res.status(401).json({ type: "error", message: "Unauthorized" });
        }

        if (!jobNo) return res.status(400).send({ message: "Job number is required", type: "error" });
        if (!orderType) return res.status(400).send({ message: "Order type is required", type: "error" });
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

        const firstRow: CompositionInput | undefined = compositions[0];
        const lotNo: string = firstRow?.lotNo || "";
        const yarnCount: string = firstRow?.yarnCount || "";
        const stichLength: string = firstRow?.stichLength || "";
        const machineDia: string = firstRow?.machineDia || "";

        const rules = getRules(orderType);
        if (rules.lotNo && isInvalid(lotNo)) return res.status(400).send({ message: "Lot No is required", type: "error" });
        if (rules.yarnCount && isInvalid(yarnCount)) return res.status(400).send({ message: "Yarn Count is required", type: "error" });
        if (rules.machineDia && isInvalid(machineDia)) return res.status(400).send({ message: "Machine Dia is required", type: "error" });
        if (rules.stichLength && isInvalid(stichLength)) return res.status(400).send({ message: "Stich Length is required", type: "error" });

        const resolvedQtyByIndex: (number | null)[] = [];
        const resolvedPriceByIndex: (number | null)[] = [];

        for (let i = 0; i < compositions.length; i++) {
            const comp: CompositionInput | undefined = compositions[i];

            if (!comp || !comp.composition || !comp.color) {
                return res.status(400).send({ message: `Composition ${i + 1}: composition and color are required`, type: "error" });
            }

            if (orderType === "yarnDyeingOrder") {
                const yarnColors: YarnColorInput[] = comp.yarnColors ?? [];
                if (yarnColors.length === 0) {
                    return res.status(400).send({ message: `Composition ${i + 1}: at least one yarn color is required`, type: "error" });
                }

                let rowQty = 0;
                let rowAmount = 0;
                for (let j = 0; j < yarnColors.length; j++) {
                    const yc: YarnColorInput | undefined = yarnColors[j];
                    const qty = toValidNumber(yc?.qty);
                    const price = toValidNumber(yc?.price);
                    if (!yc || !yc.color || qty === null || price === null) {
                        return res.status(400).send({ message: `Composition ${i + 1}, Yarn Color ${j + 1}: color, valid qty and price are required`, type: "error" });
                    }
                    rowQty += qty;
                    rowAmount += qty * price;
                }
                resolvedQtyByIndex.push(rowQty);
                resolvedPriceByIndex.push(rowQty > 0 ? rowAmount / rowQty : 0);
            } else {
                const workOrderQty = toValidNumber(comp.workOrderQty);
                if (workOrderQty === null) {
                    return res.status(400).send({ message: `Composition ${i + 1}: valid work order quantity is required`, type: "error" });
                }
                const unitPrice = toValidNumber(comp.unitPrice);
                if (unitPrice === null) {
                    return res.status(400).send({ message: `Composition ${i + 1}: valid price per kg is required`, type: "error" });
                }
                resolvedQtyByIndex.push(workOrderQty);
                resolvedPriceByIndex.push(unitPrice);
            }
        }

        // ── Fetch ALL rows of the style requirement with the fields needed for matching ──
        const findStyleRequirement = await prisma.styleRequirement.findUnique({
            where: { jobNo },
            select: {
                jobNo: true,
                id: true,
                rows: {
                    select: { id: true, composition: true, color: true },
                    orderBy: { id: "asc" },
                },
            },
        });
        if (!findStyleRequirement) {
            return res.status(404).send({ message: "Style requirement not found for this job number", type: "error" });
        }
        if (findStyleRequirement.rows.length === 0) {
            return res.status(404).send({ message: "Style requirement row not found for this job number", type: "error" });
        }

        // ── FIX: resolve the correct styleRequirementRowId for EACH composition ──
        const rows = findStyleRequirement.rows;
        const validRowIds = new Set<number>(rows.map((r) => r.id));
        const rowIdByKey = new Map<string, number>();
        for (const r of rows) {
            const key = rowKey(r.composition, r.color);
            // keep the first row if duplicates exist (rows are ordered by id asc)
            if (!rowIdByKey.has(key)) rowIdByKey.set(key, r.id);
        }

        const styleRequirementRowIdByIndex: number[] = [];
        for (let i = 0; i < compositions.length; i++) {
            const comp = compositions[i] as CompositionInput;
            let resolvedId: number | undefined;

            // 1) explicit id from the client (must belong to this job's style requirement)
            if (!isInvalid(comp.styleRequirementRowId)) {
                const explicitId = Number(comp.styleRequirementRowId);
                if (Number.isNaN(explicitId) || !validRowIds.has(explicitId)) {
                    return res.status(400).send({
                        message: `Composition ${i + 1}: styleRequirementRowId does not belong to this job's style requirement`,
                        type: "error",
                    });
                }
                resolvedId = explicitId;
            }

            // 2) match by composition + color
            if (resolvedId === undefined) {
                resolvedId = rowIdByKey.get(rowKey(comp.composition, comp.color));
            }

            // 3) only one row exists -> it can only be that one
            if (resolvedId === undefined && rows.length === 1) {
                resolvedId = rows[0]!.id;
            }

            // 4) ambiguous -> fail loudly instead of linking the wrong row
            if (resolvedId === undefined) {
                return res.status(400).send({
                    message: `Composition ${i + 1}: no matching style requirement row found for "${comp.composition}" / "${comp.color}"`,
                    type: "error",
                });
            }

            styleRequirementRowIdByIndex.push(resolvedId);
        }

        const jobRecord = await checkDataExist(jobNo);
        if (!jobRecord?.id) {
            return res.status(404).send({ message: "Job record not found", type: "error" });
        }

        const workOrder = await prisma.$transaction(
            async (tx) => {
                return await tx.workOrder.create({
                    data: {
                        workOrderPlaceDate,
                        workOrderNo,
                        month,
                        styleNo: styleNo || style || "",
                        lotNo,
                        jobNo,
                        factoryName,
                        orderType,
                        jobId: jobRecord.id,
                        styleRequirementId: findStyleRequirement.id,
                        yarnCount,
                        stichLength,
                        machineDia,
                        createdBy: userId,
                        compositions: {
                            create: compositions.map((c: CompositionInput, i: number) => {
                                const compData: any = {
                                    composition: c.composition,
                                    color: c.color,
                                    orderQty: 0,
                                    workOrderQty: resolvedQtyByIndex[i] ?? 0,
                                    unitePrice: resolvedPriceByIndex[i] ?? 0,
                                    styleRequirementRowId: styleRequirementRowIdByIndex[i],
                                    orderType,
                                };

                                if (orderType === "yarnDyeingOrder" && c.yarnColors && c.yarnColors.length > 0) {
                                    compData.yarnColors = {
                                        create: c.yarnColors.map((yc) => ({
                                            color: yc.color,
                                            shade: yc.shade || "",
                                            yarnCount: yc.yarnCount || "",
                                            machineDia: yc.machineDia || "",
                                            lotNo: yc.lotNo || "",
                                            qty: toValidNumber(yc.qty) ?? 0,
                                            price: toValidNumber(yc.price) ?? 0,
                                        })),
                                    };
                                }

                                return compData;
                            }),
                        },
                    },
                    include: { compositions: true },
                });
            },
            {
                timeout: 15000,
                maxWait: 20000,
            }
        );

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
        const code = (e as { code?: string })?.code;

        if (code === "P2002") {
            return res.status(409).send({ message: "A work order with this number already exists", type: "error" });
        }
        if (code === "P2003") {
            return res.status(400).send({ message: "Invalid reference data - please check your inputs", type: "error" });
        }

        return res.status(500).send({ message: "Internal server error while creating work order", type: "error" });
    }
};