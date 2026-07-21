import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

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
    processLoss: number;
    additional: number;
}

interface UploadSummary {
    stylesCreated: number;
    stylesUpdated: number;
    rowsInserted: number;
    rowsSkipped: number;
    errors: { jobNo: string; message: string }[];
}

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    io.emit(event, payload);
};

// 🔧 FIX: More robust normalization - also handle backslashes and multiple slashes
const normalizeJobNo = (jobNo: string): string => {
    if (!jobNo || typeof jobNo !== 'string') return '';
    return jobNo.trim().replace(/[\\/]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};

export const uploadDataFromFile = async (
    rows: ParsedRow[],
    jobId: string
): Promise<UploadSummary> => {
    const summary: UploadSummary = {
        stylesCreated: 0,
        stylesUpdated: 0,
        rowsInserted: 0,
        rowsSkipped: 0,
        errors: [],
    };

    // 🔧 FIX: Pre-validate and log all rows before grouping
    console.log(`📊 Style Requirement: Received ${rows.length} raw rows`);
    
    const validRows: ParsedRow[] = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) {
            summary.rowsSkipped++;
            console.log(`⏭️ Row ${i} skipped: undefined row`);
            continue;
        }
        // 🔧 FIX: Check for falsy jobNo OR empty string after trim
        const rawJobNo = row.jobNo;
        const trimmedJobNo = typeof rawJobNo === 'string' ? rawJobNo.trim() : '';
        
        if (!trimmedJobNo || trimmedJobNo === '' || trimmedJobNo.toLowerCase() === 'n/a') {
            summary.rowsSkipped++;
            console.log(`⏭️ Row ${i} skipped: invalid jobNo "${rawJobNo}"`);
            continue;
        }
        validRows.push(row);
    }
    
    console.log(`✅ Style Requirement: ${validRows.length} valid rows after filtering`);

    try {
        const groupedByJob = new Map<string, ParsedRow[]>();
        for (const row of validRows) {
            const jobNo = normalizeJobNo(row.jobNo);
            const bucket = groupedByJob.get(jobNo) ?? [];
            bucket.push(row);
            groupedByJob.set(jobNo, bucket);
        }

        const jobEntries = Array.from(groupedByJob.entries());
        const totalJobs = jobEntries.length;
        
        console.log(`📊 Style Requirement: Grouped into ${totalJobs} unique jobs`);
        // 🔧 FIX: Log first few job numbers for debugging
        jobEntries.slice(0, 5).forEach(([jobNo, rows]) => {
            console.log(`   Job "${jobNo}": ${rows.length} rows`);
        });

        emitProgress("style-req-progress", {
            jobId,
            phase: "starting",
            current: 0,
            total: totalJobs,
        });

        for (let i = 0; i < jobEntries.length; i++) {
            const entry = jobEntries[i];
            if (!entry) continue;
            const [jobNo, jobRows] = entry;
            const first = jobRows[0];
            if (!first) continue;

            try {
                const existing = await prisma.styleRequirement.findUnique({
                    where: { jobNo },
                    select: { id: true },
                });

                await prisma.$transaction(async (tx) => {
                    await tx.jobs.upsert({
                        where: { jobNo },
                        update: {},
                        create: { jobNo },
                    });

                    const parent = await tx.styleRequirement.upsert({
                        where: { jobNo },
                        update: {
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            styleNo: first.style,
                            poNo: first.poNo,
                            processLoss: Number(first.processLoss) || 0,
                        },
                        create: {
                            jobNo,
                            salesContact: first.salesContractNo,
                            buyerName: first.buyer,
                            styleNo: first.style,
                            poNo: first.poNo,
                            processLoss: Number(first.processLoss) || 0,
                        },
                    });

                    // 🔧 FIX: Delete old rows before inserting new ones (prevents duplicates on re-upload)
                    await tx.styleRequirementRow.deleteMany({
                        where: { styleRequirementId: parent.id }
                    });

                    await tx.styleRequirementRow.createMany({
                        data: jobRows.map((row) => ({
                            styleRequirementId: parent.id,
                            color: row.color || "N/A",
                            composition: row.composition || "N/A",
                            finishDia: row.finishDia || "N/A",
                            orderQty: Number(row.orderQty) || 0,
                            finishRequiredQty: Number(row.finishFabricRequired) || 0,
                            additional: Number(row.additional) || 0,
                        })),
                    });
                });

                if (existing) {
                    summary.stylesUpdated++;
                } else {
                    summary.stylesCreated++;
                }
                summary.rowsInserted += jobRows.length;

                emitProgress("style-req-progress", {
                    jobId,
                    phase: "inserting",
                    current: i + 1,
                    total: totalJobs,
                    jobNo,
                    rowsInGroup: jobRows.length,
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                summary.errors.push({ jobNo, message });
                console.error(`❌ Failed to upsert job "${jobNo}":`, message);

                emitProgress("style-req-progress", {
                    jobId,
                    phase: "error",
                    current: i + 1,
                    total: totalJobs,
                    jobNo,
                    message,
                });
            }
        }

        emitProgress("style-req-complete", { jobId, summary });
        return summary;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        emitProgress("style-req-error", { jobId, message });
        throw err;
    }
};