import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

interface TrailingRowInput {
    styleRequirementRowId: number | string;
    fabricIssueCuttingDept?: number | string;
    cadConsumption?: number | string;
    plannedCuttingQty?: number | string;
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
    plannedLeftOverQty?: number | string;
    physicalFoundLeftOver?: number | string;
    note?: string | null;
}

const NUMERIC_KEYS = [
    "fabricIssueCuttingDept",
    "cadConsumption",
    "plannedCuttingQty",
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
    "plannedLeftOverQty",
    "physicalFoundLeftOver",
] as const;

type NumericFieldKey = (typeof NUMERIC_KEYS)[number];

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
                rows: { select: { id: true } } 
            },
        });

        if (!job) {
            return res.status(404).json({ message: `No style requirement found for jobNo "${jobNo}"` });
        }

        const validRowIds = new Set(job.rows.map(r => r.id));

        const { rows } = req.body as { rows: TrailingRowInput[] };
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
            for (const key of NUMERIC_KEYS) {
                if (!(key in row)) {
                    return res.status(400).json({
                        message: `Missing required field "${key}" on styleRequirementRowId ${styleRequirementRowId}`,
                    });
                }
                
                // Safe typing for dynamic key access
                const raw = row[key as keyof TrailingRowInput];
                const num = raw === "" || raw == null ? 0 : Math.round(Number(raw));
                
                if (Number.isNaN(num)) {
                    return res.status(400).json({
                        message: `Invalid numeric value for "${key}" on styleRequirementRowId ${styleRequirementRowId}`,
                    });
                }
                numericFields[key] = num;
            }

            prepared.push({
                styleRequirementRowId,
                data: { ...numericFields, note: row.note ?? null },
            });
        }

        const results = await prisma.$transaction(
            prepared.map(({ styleRequirementRowId, data }) =>
                prisma.reconciliationData.upsert({
                    where: { styleRequirementRowId },
                    // FIX: Cast to 'any' to bypass Prisma's strict spread type checking
                    update: {
                        ...data,
                        submittedBy,
                        submittedDate: new Date(),
                    } as any, 
                    // FIX: Cast to 'any' to bypass Prisma's strict spread type checking
                    create: {
                        ...data,
                        submittedBy,
                        submittedDate: new Date(),
                        styleRequirementRowId,
                    } as any, 
                })
            )
        );

        return res.status(200).json({ message: "Reconciliation data saved", data: results });
    } catch (err) {
        console.error("styleReconciliation error:", err);
        return res.status(500).json({ message: "Failed to save reconciliation data" });
    }
};