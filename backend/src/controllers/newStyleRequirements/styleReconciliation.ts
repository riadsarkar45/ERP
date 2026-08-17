import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

interface TrailingRowInput {
    styleRequirementRowId: number | string;
    fabricIssueCuttingDept?: number | string;
    actualCuttingQty?: number | string;
    cuttingToSewingInput?: number | string;
    physicalFound?: number | string;
    sewingInputQty?: number | string;
    sewingOutputQty?: number | string;
    finishInputQty?: number | string;
    finishOutputQty?: number | string;
    packingInputQty?: number | string;
    packingOutputQty?: number | string;
    shippedQty?: number | string;
    physicalFoundLeftOver?: number | string;
    sentForEmbellishment?: number | string;
    receivedFromEmbellishment?: number | string;
    // FIXED: was "manufacturingUnit" (no trailing "e") — the frontend actually
    // sends the key as "manufacturingUnite" (matches the Prisma column name).
    // That mismatch meant this field was ALWAYS undefined, so every save
    // wrote null/"" regardless of what the user typed, and on first-time
    // creates it threw "Argument `manufacturingUnite` must not be null."
    // because the Prisma column is a required (non-nullable) String.
    manufacturingUnite?: string | null;
}

const REQUIRED_NUMERIC_KEYS = [
    "fabricIssueCuttingDept",
    "actualCuttingQty",
    "cuttingToSewingInput",
    "physicalFound",
    "sewingInputQty",
    "sewingOutputQty",
    "finishInputQty",
    "finishOutputQty",
    "packingInputQty",
    "packingOutputQty",
    "shippedQty",
    "physicalFoundLeftOver",
] as const;

const OPTIONAL_NUMERIC_KEYS = [
    "sentForEmbellishment",
    "receivedFromEmbellishment",
] as const;

type RequiredNumericKey = (typeof REQUIRED_NUMERIC_KEYS)[number];
type OptionalNumericKey = (typeof OPTIONAL_NUMERIC_KEYS)[number];

const toNumber = (raw: unknown): number | null => {
    if (raw === "" || raw == null) return 0;
    const num = Math.round(Number(raw));
    return Number.isNaN(num) ? null : num;
};

export const styleReconciliation = async (req: Request, res: Response) => {
    try {
        const { jobNo } = req.params as { jobNo: string };
        if (!jobNo) {
            return res.status(400).json({ message: "jobNo is required" });
        }

        // Fetch job WITH its valid row IDs to prevent IDOR security vulnerabilities
        const job = await prisma.styleRequirement.findFirst({
            where: { jobNo },
            select: {
                id: true,
                rows: { select: { id: true } },
            },
        });

        if (!job) {
            return res.status(404).json({ message: `No style requirement found for jobNo "${jobNo}"` });
        }

        const validRowIds = new Set(job.rows.map((r) => r.id));

        const { rows, notes } = req.body as { rows: TrailingRowInput[]; notes?: string | null };
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "rows array is required and cannot be empty" });
        }

        const submittedBy = "Riad"; // TODO: swap for req.user?.username once auth middleware attaches it

        const prepared: Array<{ styleRequirementRowId: number; data: Record<string, number | string | null> }> = [];

        for (const row of rows) {
            const styleRequirementRowId = Number(row.styleRequirementRowId);
            if (!styleRequirementRowId || Number.isNaN(styleRequirementRowId)) {
                return res.status(400).json({ message: "Each row requires a valid styleRequirementRowId" });
            }

            // Security check: ensure row belongs to this job
            if (!validRowIds.has(styleRequirementRowId)) {
                return res.status(403).json({ message: `Unauthorized: Row ${styleRequirementRowId} does not belong to job ${jobNo}` });
            }

            const numericFields: Record<string, number> = {};

            for (const key of REQUIRED_NUMERIC_KEYS) {
                if (!(key in row)) {
                    return res.status(400).json({
                        message: `Missing required field "${key}" on styleRequirementRowId ${styleRequirementRowId}`,
                    });
                }
                const num = toNumber(row[key as keyof TrailingRowInput]);
                if (num === null) {
                    return res.status(400).json({
                        message: `Invalid numeric value for "${key}" on styleRequirementRowId ${styleRequirementRowId}`,
                    });
                }
                numericFields[key] = num;
            }

            for (const key of OPTIONAL_NUMERIC_KEYS) {
                const num = toNumber(row[key as keyof TrailingRowInput] ?? 0);
                numericFields[key] = num === null ? 0 : num;
            }

            // Derived/FORMULA fields
            const cadConsumption = 0;
            const plannedCuttingQty = 0;
            const sewingInputQty = numericFields["sewingInputQty"] ?? 0;
            const shippedQty = numericFields["shippedQty"] ?? 0;
            const plannedLeftOverQty = sewingInputQty - shippedQty;

            numericFields.cadConsumption = cadConsumption;
            numericFields.plannedCuttingQty = plannedCuttingQty;
            numericFields.plannedLeftOverQty = plannedLeftOverQty;

            const manufacturingUnite =
                row.manufacturingUnite != null && row.manufacturingUnite !== ""
                    ? String(row.manufacturingUnite)
                    : "";

            prepared.push({
                styleRequirementRowId,
                data: {
                    ...numericFields,
                    note: notes ?? null,
                    manufacturingUnite,
                },
            });
        }

        // Prepare transaction operations
        const transactionOperations: any[] = prepared.map(({ styleRequirementRowId, data }) =>
            prisma.reconciliationData.upsert({
                where: { styleRequirementRowId },
                update: {
                    ...data,
                    submittedBy,
                    submittedDate: new Date(),
                } as any,
                create: {
                    ...data,
                    submittedBy,
                    submittedDate: new Date(),
                    styleRequirementRowId,
                } as any,
            })
        );

        // Execute all upserts and the status update in a single atomic transaction
        const results = await prisma.$transaction(transactionOperations);

        return res.status(200).json({ message: "Reconciliation data saved", data: results });
    } catch (err) {
        console.error("styleReconciliation error:", err);
        return res.status(500).json({ message: "Failed to save reconciliation data" });
    }
};