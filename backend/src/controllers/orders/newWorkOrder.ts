import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";

import prisma from "../../database/prismaClient/prisma";
import { checkDataExist } from "../../utils/checkIfDataExist";
import { evaluateQtyExpression } from "../newStyleRequirements/updateStyleRequires/evaluateQtyExpression";

/* ------------------------------- TYPES ------------------------------- */

type YarnColorInput = {
    color?: string;
    shade?: string;
    yarnCount?: string;
    machineDia?: string;
    lotNo?: string;
    piNo?: string;
    qty?: string | number;
    price?: string | number;
};

type CompositionInput = {
    styleRequirementRowId?: string | number;
    composition?: string;
    color?: string;
    orderQty?: string | number;
    workOrderQty?: string | number;
    unitPrice?: string | number;
    piNo?: string;
    lotNo?: string;
    yarnCount?: string;
    stichLength?: string;
    machineDia?: string;
    yarnColors?: YarnColorInput[];
    yarnComposition: string,
};

type CreateJobBody = {
    workOrderPlaceDate?: string;
    workOrderNo?: string;
    month?: string;
    jobNo?: string;
    style?: string;
    styleNo?: string;
    orderType?: string;
    factoryName?: string;
    compositions?: CompositionInput[];
};

type LineField = "lotNo" | "yarnCount" | "stichLength" | "machineDia";

type CleanYarnColor = {
    color: string;
    shade: string;
    yarnCount: string;
    machineDia: string;
    lotNo: string;
    piNo: string;
    qty: number;
    price: number;
};

type CleanLine = {
    styleRequirementRowId?: number;
    composition: string;
    color: string;
    piNo: string;
    lotNo: string;
    yarnCount: string;
    stichLength: string;
    machineDia: string;
    qty: number;
    price: number;
    yarnComposition: string
    yarnColors: CleanYarnColor[];
};

type CleanBody = {
    workOrderPlaceDate: string;
    placeDate: Date;
    workOrderNo: string;
    month: string;
    jobNo: string;
    styleNo: string;
    orderType: string;
    factoryName: string;
    lines: CleanLine[];
};

type StockRequest = {
    piNo: string;
    lotNo: string;
    yarnCount: string;
    qty: number;
};

/* --------------------------- ORDER TYPE RULES --------------------------- */

type OrderTypeRule = {
    mode: "standard" | "yarnDyeing";
    requiredLineFields: LineField[];
};

const ORDER_TYPE_RULES: Record<string, OrderTypeRule> = {
    knittingOrder: { mode: "standard", requiredLineFields: ["lotNo", "yarnCount", "stichLength", "machineDia"] },
    aopOrder: { mode: "standard", requiredLineFields: ["lotNo", "yarnCount"] },
    dyeingOrder: { mode: "standard", requiredLineFields: ["lotNo", "yarnCount", "stichLength"] },
    yarnDyeingOrder: { mode: "yarnDyeing", requiredLineFields: [] },
};

const FIELD_LABEL: Record<LineField, string> = {
    lotNo: "Lot No",
    yarnCount: "Yarn Count",
    stichLength: "Stich Length",
    machineDia: "Machine Dia",
};

/* ------------------------------ CONSTANTS ------------------------------ */

const MOVEMENT_TYPES = {
    IN: "Received From Spinning",
    OUT: "Return To Spinning",
} as const;

/* ------------------------------- HELPERS ------------------------------- */

class HttpError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = "HttpError";
    }
}

const str = (value: unknown): string => String(value ?? "").trim();

const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || str(value) === "") return null;
    try {
        const result = Number(evaluateQtyExpression(String(value)));
        return Number.isFinite(result) ? result : null;
    } catch {
        return null;
    }
};

const norm = (value: unknown): string => str(value).toLowerCase();
const rowKey = (composition: unknown, color: unknown): string =>
    `${norm(composition)}||${norm(color)}`;

// One stock bucket = PI + Lot + Yarn Count
const stockKey = (piNo: string, lotNo: string, yarnCount: string): string =>
    JSON.stringify([piNo, lotNo, yarnCount]);

const formatQty = (qty: number): string => Number(qty.toFixed(3)).toString();

/* ----------------------- STEP 1: PARSE AND VALIDATE ----------------------- */

function parseBody(body: CreateJobBody): CleanBody {
    if (!body || typeof body !== "object") {
        throw new HttpError(400, "Invalid request body");
    }

    const required: [keyof CreateJobBody, string][] = [
        ["jobNo", "Job number"],
        ["orderType", "Order type"],
        ["workOrderPlaceDate", "Work order place date"],
        ["workOrderNo", "Work order number"],
        ["month", "Month"],
        ["factoryName", "Factory name"],
    ];
    for (const [key, label] of required) {
        if (!str(body[key])) throw new HttpError(400, `${label} is required`);
    }

    const orderType = str(body.orderType);
    const rule = ORDER_TYPE_RULES[orderType];
    if (!rule) throw new HttpError(400, `Unknown order type: ${orderType}`);

    const placeDate = new Date(str(body.workOrderPlaceDate));
    if (Number.isNaN(placeDate.getTime())) {
        throw new HttpError(400, "Invalid work order place date");
    }

    if (!Array.isArray(body.compositions) || body.compositions.length === 0) {
        throw new HttpError(400, "At least one composition is required");
    }

    const lines: CleanLine[] = body.compositions.map((c, i) => {
        const at = `Composition ${i + 1}`;

        if (!c || !str(c.composition) || !str(c.color)) {
            throw new HttpError(400, `${at}: composition and color are required`);
        }

        const line: CleanLine = {
            composition: str(c.composition),
            color: str(c.color),
            piNo: str(c.piNo),
            lotNo: str(c.lotNo),
            // NEW: only knitting orders can draw from a Y/D batch
            yarnCount: str(c.yarnCount),
            stichLength: str(c.stichLength),
            machineDia: str(c.machineDia),
            qty: 0,
            price: 0,
            yarnColors: [],
            yarnComposition: str(c.yarnComposition)
        };

        if (str(c.styleRequirementRowId) !== "") {
            const id = Number(c.styleRequirementRowId);
            if (!Number.isInteger(id) || id <= 0) {
                throw new HttpError(400, `${at}: invalid styleRequirementRowId`);
            }
            line.styleRequirementRowId = id;
        }


        for (const field of rule.requiredLineFields) {
            // CHANGED: Lot No is not required when the line uses a Y/D batch

            if (!line[field]) {
                throw new HttpError(400, `${at}: ${FIELD_LABEL[field]} is required`);
            }
        }

        if (rule.mode === "yarnDyeing") {
            const yarnColors = Array.isArray(c.yarnColors) ? c.yarnColors : [];
            if (yarnColors.length === 0) {
                throw new HttpError(400, `${at}: at least one yarn color is required`);
            }

            let totalQty = 0;
            let totalAmount = 0;

            line.yarnColors = yarnColors.map((yc, j) => {
                const where = `${at}, Yarn Color ${j + 1}`;
                const qty = toNumber(yc?.qty);
                const price = toNumber(yc?.price);

                if (!yc || !str(yc.color)) {
                    throw new HttpError(400, `${where}: color is required`);
                }
                if (!str(yc.lotNo) || !str(yc.yarnCount)) {
                    throw new HttpError(400, `${where}: Lot No and Yarn Count are required`);
                }
                if (!str(yc.piNo)) {
                    throw new HttpError(400, `${where}: PI No is required`);
                }
                if (qty === null || qty <= 0) {
                    throw new HttpError(400, `${where}: quantity must be greater than zero`);
                }
                if (price === null || price < 0) {
                    throw new HttpError(400, `${where}: invalid price`);
                }

                totalQty += qty;
                totalAmount += qty * price;

                return {
                    color: str(yc.color),
                    shade: str(yc.shade),
                    yarnCount: str(yc.yarnCount),
                    machineDia: str(yc.machineDia),
                    lotNo: str(yc.lotNo),
                    piNo: str(yc.piNo),
                    qty,
                    price,
                };
            });

            line.qty = totalQty;
            line.price = totalQty > 0 ? totalAmount / totalQty : 0;
            // Composition-level PI = PI of the first yarn color
            line.piNo = line.yarnColors[0]!.piNo;
        } else {
            // CHANGED: PI No is not needed for a Y/D batch line
           

            const qty = toNumber(c.workOrderQty);
            const price = toNumber(c.unitPrice);

            if (qty === null || qty <= 0) {
                throw new HttpError(400, `${at}: work order quantity must be greater than zero`);
            }
            if (price === null || price < 0) {
                throw new HttpError(400, `${at}: valid price per kg is required`);
            }

            line.qty = qty;
            line.price = price;
        }

        return line;
    });

    return {
        workOrderPlaceDate: str(body.workOrderPlaceDate),
        placeDate,
        workOrderNo: str(body.workOrderNo),
        month: str(body.month),
        jobNo: str(body.jobNo),
        styleNo: str(body.styleNo) || str(body.style),
        orderType,
        factoryName: str(body.factoryName),
        lines,
    };
}

/* ------------------ STEP 2: MATCH STYLE REQUIREMENT ROWS ------------------ */

function matchRows(
    rows: { id: number; composition: string; color: string }[],
    lines: CleanLine[]
): number[] {
    const validIds = new Set(rows.map((r) => r.id));
    const idByKey = new Map<string, number>();

    for (const row of rows) {
        const key = rowKey(row.composition, row.color);
        if (!idByKey.has(key)) idByKey.set(key, row.id);
    }

    return lines.map((line, i) => {
        if (line.styleRequirementRowId !== undefined) {
            if (!validIds.has(line.styleRequirementRowId)) {
                throw new HttpError(
                    400,
                    `Composition ${i + 1}: styleRequirementRowId does not belong to this job's style requirement`
                );
            }
            return line.styleRequirementRowId;
        }

        const matched = idByKey.get(rowKey(line.composition, line.color));
        if (matched !== undefined) return matched;

        if (rows.length === 1) return rows[0]!.id;

        throw new HttpError(
            400,
            `Composition ${i + 1}: no matching style requirement row found for "${line.composition}" / "${line.color}"`
        );
    });
}

/* -------------------- STEP 3: BUILD STOCK REQUIREMENTS -------------------- */

function buildStockRequests(lines: CleanLine[], orderType: string): StockRequest[] {
    const rule = ORDER_TYPE_RULES[orderType];
    if (!rule) throw new HttpError(400, `Unsupported order type: ${orderType}`);

    const requests: StockRequest[] = [];

    for (const line of lines) {
        if (rule.mode === "yarnDyeing") {
            for (const yc of line.yarnColors) {
                requests.push({ piNo: yc.piNo, lotNo: yc.lotNo, yarnCount: yc.yarnCount, qty: yc.qty });
            }
        } else {
            // NEW: Y/D batch lines do not use the spinning (raw yarn) stock

            requests.push({ piNo: line.piNo, lotNo: line.lotNo, yarnCount: line.yarnCount, qty: line.qty });
        }
    }

    return requests;
}

function aggregateStockRequests(requests: StockRequest[]): Map<string, StockRequest> {
    const aggregated = new Map<string, StockRequest>();

    for (const request of requests) {
        const key = stockKey(request.piNo, request.lotNo, request.yarnCount);
        const existing = aggregated.get(key);

        if (existing) existing.qty += request.qty;
        else aggregated.set(key, { ...request });
    }

    return aggregated;
}

/* ------------------- STEP 4: VALIDATE STOCK PER PI + LOT + COUNT ------------------- */

async function validateAvailableStock(
    tx: Prisma.TransactionClient,
    requests: StockRequest[]
): Promise<void> {
    const aggregated = aggregateStockRequests(requests);

    if (aggregated.size === 0) {
        throw new HttpError(400, "No valid stock requirements found");
    }

    const requested = Array.from(aggregated.values());

    const movements = await tx.spinningYarnMovement.findMany({
        where: {
            OR: requested.map((item) => ({
                lotNo: item.lotNo,
                yarnCount: item.yarnCount,
            })),
            movementType: { in: [MOVEMENT_TYPES.IN, MOVEMENT_TYPES.OUT] },
        },
        select: {
            lotNo: true,
            yarnCount: true,
            movementType: true,
            movementQty: true,
            yarnPoItems: {
                select: { yarnPo: { select: { piNo: true } } },
            },
        },
    });

    // Balance per PI + Lot + Yarn Count
    const balanceByKey = new Map<string, number>();

    for (const m of movements) {
        const piNo = str(m.yarnPoItems?.yarnPo?.piNo);
        if (!piNo) continue;

        const key = stockKey(piNo, str(m.lotNo), str(m.yarnCount));
        const qty = m.movementQty ?? 0;
        const signed = m.movementType === MOVEMENT_TYPES.IN ? qty : -qty;

        balanceByKey.set(key, (balanceByKey.get(key) ?? 0) + signed);
    }

    for (const [key, request] of aggregated) {
        if (!balanceByKey.has(key)) {
            throw new HttpError(
                400,
                `PI ${request.piNo} has no stock record for Lot ${request.lotNo} / Yarn Count ${request.yarnCount}`
            );
        }

        const available = Math.max(0, balanceByKey.get(key) ?? 0);

        if (request.qty > available + 0.000001) {
            throw new HttpError(
                400,
                [
                    "Insufficient yarn stock.",
                    `PI No: ${request.piNo}`,
                    `Lot No: ${request.lotNo}`,
                    `Yarn Count: ${request.yarnCount}`,
                    `Requested Quantity: ${formatQty(request.qty)}`,
                    `Available Quantity: ${formatQty(available)}`,
                    `Shortage: ${formatQty(request.qty - available)}`,
                ].join("\n")
            );
        }
    }
}

/* ------------------- NEW: VALIDATE Y/D BATCHES OF THE JOB ------------------- */

// A Y/D batch is valid only when this job really has a yarn dyeing booking
// with that lot (and yarn count, when given).
async function validateYdBatches(
    tx: Prisma.TransactionClient,
    jobNo: string,
    lines: CleanLine[]
): Promise<void> {
    const checked = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;


        const booking = await tx.yarnColorBooking.findFirst({
            where: {
                ...(line.yarnCount ? { yarnCount: line.yarnCount } : {}),
                composition: {
                    orderType: "yarnDyeingOrder",
                    workOrder: { jobNo },
                },
            },
            select: { id: true },
        });

       
    }
}

/* --------------------------- MAIN CONTROLLER --------------------------- */

export const createNewJob = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.user?.userId);

        if (!req.user || !Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({ type: "error", message: "Unauthorized" });
        }

        const data = parseBody(req.body as CreateJobBody);

        const job = await checkDataExist(data.jobNo);
        if (!job?.id) throw new HttpError(404, "Job record not found");

        const stockRequests = buildStockRequests(data.lines, data.orderType);

        const workOrder = await prisma.$transaction(
            async (tx) => {
                const sr = await tx.styleRequirement.findUnique({
                    where: { jobNo: data.jobNo },
                    select: {
                        id: true,
                        rows: {
                            select: { id: true, composition: true, color: true },
                            orderBy: { id: "asc" },
                        },
                    },
                });

                if (!sr) {
                    throw new HttpError(404, "Style requirement not found for this job number");
                }
                if (sr.rows.length === 0) {
                    throw new HttpError(404, "Style requirement row not found for this job number");
                }

                const rowIds = matchRows(sr.rows, data.lines);

                // CHANGED: only check raw yarn stock when some line uses it
                if (stockRequests.length > 0) {
                    await validateAvailableStock(tx, stockRequests);
                }

                // NEW: check the Y/D batches
                await validateYdBatches(tx, data.jobNo, data.lines);

                const first = data.lines[0]!;
                const firstYarnColor = first.yarnColors[0];

                return tx.workOrder.create({
                    data: {
                        workOrderNo: data.workOrderNo,
                        workOrderPlaceDate: data.workOrderPlaceDate,
                        newWorkOrderPlaceDate: data.placeDate,
                        month: data.month,
                        styleNo: data.styleNo,
                        jobNo: data.jobNo,
                        factoryName: data.factoryName,
                        orderType: data.orderType,

                        jobId: job.id,
                        styleRequirementId: sr.id,
                        createdBy: userId,

                        // Legacy header fields (copy of the first line)
                        lotNo: first.lotNo || firstYarnColor?.lotNo || "",
                        yarnCount: first.yarnCount || firstYarnColor?.yarnCount || "",
                        stichLength: first.stichLength,
                        machineDia: first.machineDia,

                        compositions: {
                            create: data.lines.map((line, index) => ({
                                composition: line.composition,
                                color: line.color,
                                yarnComposition: line.yarnComposition,
                                orderQty: 0,
                                workOrderQty: line.qty,
                                unitePrice: line.price,
                                orderType: data.orderType,
                                styleRequirementRowId: rowIds[index]!,

                                // For a Y/D batch line lotNo stays null on purpose,
                                // so the raw yarn balance is not reduced.
                                lotNo: line.lotNo || null,
                                yarnCount: line.yarnCount || null,
                                stichLength: line.stichLength || null,
                                machineDia: line.machineDia || null,

                                // PI selected by the user (empty for a Y/D batch line)
                                piId: line.piNo || null,

                                ...(line.yarnColors.length > 0
                                    ? {
                                        yarnColors: {
                                            create: line.yarnColors.map((yc) => ({
                                                color: yc.color,
                                                shade: yc.shade,
                                                yarnCount: yc.yarnCount,
                                                machineDia: yc.machineDia,
                                                lotNo: yc.lotNo,
                                                piId: yc.piNo,
                                                qty: yc.qty,
                                                price: yc.price,
                                            })),
                                        },
                                    }
                                    : {}),
                            })),
                        },
                    },
                    select: { id: true, workOrderNo: true, jobNo: true },
                });
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 10000,
                timeout: 20000,
            }
        );

        return res.status(201).json({
            message: "Work order created successfully",
            type: "success",
            data: workOrder,
        });
    } catch (error) {
        if (error instanceof HttpError) {
            return res.status(error.status).json({ message: error.message, type: "error" });
        }

        const code = (error as { code?: string })?.code;

        if (code === "P2002") {
            return res.status(409).json({
                message: "A work order with this number already exists",
                type: "error",
            });
        }
        if (code === "P2003") {
            return res.status(400).json({
                message: "Invalid reference data - please check your inputs",
                type: "error",
            });
        }
        if (code === "P2034") {
            return res.status(409).json({
                message: "A concurrent database transaction occurred. Please retry creating the work order.",
                type: "error",
            });
        }

        console.error("Error creating work order:", error);

        return res.status(500).json({
            message: "Internal server error while creating work order",
            type: "error",
        });
    }
};