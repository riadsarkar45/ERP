import prisma from "../../database/prismaClient/prisma";

// ── Types ─────────────────────────────────────────────────────────
// Matches the parsed-row shape produced by the Excel parsing controller
interface ParsedRow {
    salesContractNo: string;
    buyer: string;
    jobNo: string;
    poNo: string;
    style: string;
    color: string;
    composition: string;
    finishDia: string;
    orderQty: number;
    finishFabricRequired: number;
}

interface UploadSummary {
    stylesCreated: number;
    stylesUpdated: number;
    rowsInserted: number;
    rowsSkipped: number;
    errors: { style: string; message: string }[];
}

// ── Main ──────────────────────────────────────────────────────────
/**
 * Writes parsed Excel rows into Neon:
 *  - One StyleRequirement per unique `style` (upserted on styleNo)
 *  - One StyleRequirementRow per source row, linked to that StyleRequirement
 *
 * Rows with no `style` value are skipped since StyleRequirementRow
 * requires a parent StyleRequirement to attach to.
 *
 * No per-row data is returned — just a summary, since there's no
 * preview step on the frontend.
 */
export const uploadDataFromFile = async (
    rows: ParsedRow[]
): Promise<UploadSummary> => {
    const summary: UploadSummary = {
        stylesCreated: 0,
        stylesUpdated: 0,
        rowsInserted: 0,
        rowsSkipped: 0,
        errors: [],
    };

    // Group rows by styleNo so each style only triggers one upsert,
    // not one per row.
    const groupedByStyle = new Map<string, ParsedRow[]>();
    for (const row of rows) {
        if (!row.style) {
            summary.rowsSkipped++;
            continue;
        }
        const bucket = groupedByStyle.get(row.style) ?? [];
        bucket.push(row);
        groupedByStyle.set(row.style, bucket);
    }

    for (const [styleNo, styleRows] of groupedByStyle) {
        const first = styleRows[0];
        if (!first) {
            continue;
        }

        try {
            const existing = await prisma.styleRequirement.findUnique({
                where: { styleNo },
                select: { id: true },
            });

            const styleRequirement = await prisma.$transaction(async (tx) => {
                const parent = await tx.styleRequirement.upsert({
                    where: { styleNo },
                    update: {
                        salesContact: first.salesContractNo,
                        buyerName: first.buyer,
                        jobNo: first.jobNo,
                        poNo: first.poNo,
                    },
                    create: {
                        styleNo,
                        salesContact: first.salesContractNo,
                        buyerName: first.buyer,
                        jobNo: first.jobNo,
                        poNo: first.poNo,
                        processLoss: "0",
                    },
                });

                await tx.styleRequirementRow.createMany({
                    data: styleRows.map((row) => ({
                        styleRequirementId: parent.id,
                        color: row.color,
                        composition: row.composition,
                        finishDia: row.finishDia,
                        orderQty: row.orderQty,
                        finishRequiredQty: row.finishFabricRequired,
                    })),
                });

                return parent;
            });

            if (existing) {
                summary.stylesUpdated++;
            } else {
                summary.stylesCreated++;
            }
            summary.rowsInserted += styleRows.length;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            summary.errors.push({ style: styleNo, message });
        }
    }

    return summary;
};