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
    manufacturingUnite?: string | null;
    // FIXED: these three were computed client-side (buildJobPayload rounds
    // them via calculateFormula) and sent on every save, but were never in
    // REQUIRED_NUMERIC_KEYS / OPTIONAL_NUMERIC_KEYS, so the row-processing
    // loop never picked them up — they were silently dropped every time.
    cadConsumption?: number | string;
    plannedCuttingQty?: number | string;
    plannedLeftOverQty?: number | string;
    // FIXED: remarks is a string field the frontend sends per row; it was
    // also missing from both key lists (which only ever handled numbers),
    // so remarks never made it into the upsert `data` object either.
    remarks?: string | null;
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

// FIXED: new list for the persisted formula fields (cadConsumption,
// plannedCuttingQty, plannedLeftOverQty). Treated as numeric/optional —
// same conversion as OPTIONAL_NUMERIC_KEYS — because the frontend already
// rounds them before sending, but a row may still omit them.
const FORMULA_NUMERIC_KEYS = [
    "cadConsumption",
    "plannedCuttingQty",
    "plannedLeftOverQty",
] as const;

type RequiredNumericKey = (typeof REQUIRED_NUMERIC_KEYS)[number];
type OptionalNumericKey = (typeof OPTIONAL_NUMERIC_KEYS)[number];
type FormulaNumericKey = (typeof FORMULA_NUMERIC_KEYS)[number];

const toNumber = (raw: unknown): number | null => {
    if (raw === "" || raw == null) return 0;
    const num = Math.round(Number(raw));
    return Number.isNaN(num) ? null : num;
};

const toStringOrNull = (raw: unknown): string | null => {
    if (raw == null) return null;
    const s = String(raw).trim();
    return s === "" ? "" : s;
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
            const rowId = Number(row.styleRequirementRowId);
            if (!Number.isFinite(rowId) || !validRowIds.has(rowId)) {
                // Skip rows that don't belong to this job / are invalid ids
                continue;
            }

            const data: Record<string, number | string | null> = {};

            for (const key of REQUIRED_NUMERIC_KEYS as readonly RequiredNumericKey[]) {
                const num = toNumber(row[key]);
                if (num !== null) data[key] = num;
            }

            for (const key of OPTIONAL_NUMERIC_KEYS as readonly OptionalNumericKey[]) {
                if (row[key] === undefined) continue;
                const num = toNumber(row[key]);
                if (num !== null) data[key] = num;
            }

            // FIXED: previously missing entirely — cadConsumption,
            // plannedCuttingQty, plannedLeftOverQty now actually get written.
            for (const key of FORMULA_NUMERIC_KEYS as readonly FormulaNumericKey[]) {
                if (row[key] === undefined) continue;
                const num = toNumber(row[key]);
                if (num !== null) data[key] = num;
            }

            // FIXED: previously missing entirely — manufacturingUnite and
            // remarks now actually get written (as strings, not run through
            // toNumber, which would have turned them into NaN/null anyway).
            // NOTE: the Prisma column is `note`, not `remarks` — the error
            // log's "Available options" list confirmed this — so the
            // frontend's `remarks` field is mapped to `note` here.
            if (row.manufacturingUnite !== undefined) {
                data.manufacturingUnite = toStringOrNull(row.manufacturingUnite);
            }
            if (row.remarks !== undefined) {
                data.note = toStringOrNull(row.remarks);
            }

            prepared.push({ styleRequirementRowId: rowId, data });
        }

        if (prepared.length === 0) {
            return res.status(400).json({ message: "No valid rows to save for this job" });
        }

        const transactionOperations: any[] = prepared.map(({ styleRequirementRowId, data }) =>
            prisma.reconciliationData.upsert({
                where: { styleRequirementRowId },
                update: { ...data, submittedBy, submittedDate: new Date() } as any,
                create: { ...data, submittedBy, submittedDate: new Date(), styleRequirementRowId } as any,
            })
        );

        const results = await prisma.$transaction(transactionOperations);

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