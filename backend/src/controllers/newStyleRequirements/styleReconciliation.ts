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
        const userId = req.user?.userId;
        if (!jobNo || !userId) {
            return res.status(400).json({ message: "jobNo is required" });
        }

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

        // FIXED: dateOfReconciliation is now actually pulled out of the body
        const { rows, notes, dateOfReconciliation } = req.body as {
            rows: TrailingRowInput[];
            notes?: string | null;
            dateOfReconciliation?: string | null;
        };

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "rows array is required and cannot be empty" });
        }

        const submittedBy = userId;
        const prepared: Array<{ styleRequirementRowId: number; data: Record<string, number | string | null> }> = [];

        for (const row of rows) {
            // ... unchanged row-processing loop ...
        }

        const transactionOperations: any[] = prepared.map(({ styleRequirementRowId, data }) =>
            prisma.reconciliationData.upsert({
                where: { styleRequirementRowId },
                update: { ...data, submittedBy, submittedDate: new Date() } as any,
                create: { ...data, submittedBy, submittedDate: new Date(), styleRequirementRowId } as any,
            })
        );

        const results = await prisma.$transaction(transactionOperations);

        // FIXED: use job.id (a real unique field from the earlier lookup) instead of
        // `where: jobNo`, which isn't valid Prisma shape and would throw.
        // Also only touch the date if one was actually sent, and parse it into a Date.
        if (dateOfReconciliation) {
            await prisma.styleRequirement.update({
                where: { id: job.id },
                data: {
                    dateOfReconciliation: new Date(dateOfReconciliation),
                },
            });
        }

        return res.status(200).json({ message: "Reconciliation data saved", data: results });
    } catch (err) {
        console.error("styleReconciliation error:", err);
        return res.status(500).json({ message: "Failed to save reconciliation data" });
    }
};