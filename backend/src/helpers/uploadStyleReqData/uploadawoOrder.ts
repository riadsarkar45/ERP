import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

interface AWOParsedRow {
    workOrderDate: string;
    workOrderNo: string;
    month: string;
    salesContractNo: string;
    buyer: string;
    jobNo: string;
    poNo: string;
    style: string;
    color: string;
    composition: string;
    awoFactoryName: string;
    awoWorkOrderQty: number;
    awoPricePerKg: number;
}

interface AWOUploadSummary {
    workOrdersCreated: number;
    workOrdersUpdated: number;
    compositionsInserted: number;
    rowsSkipped: number;
    errors: { workOrderNo: string; message: string }[];
}

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    io.emit(event, payload);
};

const normalizeJobNo = (jobNo: string): string => {
    if (!jobNo || typeof jobNo !== 'string') return '';
    return jobNo.trim().replace(/[\\/]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};

const normalizeWONo = (woNo: string): string => {
    if (!woNo || typeof woNo !== 'string') return '';
    return woNo.trim().replace(/\s+/g, " ");
};

export const uploadAOWDataFromFile = async (
    rows: AWOParsedRow[],
    jobId: string
): Promise<AWOUploadSummary> => {
    const summary: AWOUploadSummary = {
        workOrdersCreated: 0,
        workOrdersUpdated: 0,
        compositionsInserted: 0,
        rowsSkipped: 0,
        errors: [],
    };

    console.log(`📊 AWO: Received ${rows.length} raw rows`);

    const validRows: AWOParsedRow[] = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row) {
            summary.rowsSkipped++;
            console.log(`⏭️ Row ${i} skipped: missing row data`);
            continue;
        }

        const rawWONo = row.workOrderNo;
        const rawJobNo = row.jobNo;
        const trimmedWONo = typeof rawWONo === 'string' ? rawWONo.trim() : '';
        const trimmedJobNo = typeof rawJobNo === 'string' ? rawJobNo.trim() : '';

        if (!trimmedWONo) {
            summary.rowsSkipped++;
            console.log(`⏭️ Row ${i} skipped: empty workOrderNo`);
            continue;
        }
        if (!trimmedJobNo || trimmedJobNo.toLowerCase() === 'n/a') {
            summary.rowsSkipped++;
            console.log(`⏭️ Row ${i} skipped: invalid jobNo "${rawJobNo}" (WO: "${trimmedWONo}")`);
            continue;
        }

        validRows.push(row);
    }

    // IMPORTANT: this key is ONLY for grouping rows into the correct work
    // order internally. It must never be written to the database or used
    // in DB where-clauses directly — jobNo/month scoping here is what
    // stops two different jobs that happen to share a plain workOrderNo
    // (e.g. both have "3") from being merged into one work order.
    const buildWOKey = (row: AWOParsedRow): string =>
        `${normalizeWONo(row.workOrderNo)}::${normalizeJobNo(row.jobNo)}::${row.month.trim()}`;

    try {
        const groupedByWO = new Map<string, AWOParsedRow[]>();
        for (const row of validRows) {
            const key = buildWOKey(row);
            const bucket = groupedByWO.get(key) ?? [];
            bucket.push(row);
            groupedByWO.set(key, bucket);
        }

        const woEntries = Array.from(groupedByWO.entries());
        const totalWOs = woEntries.length;

        console.log(`📊 AWO: Grouped into ${totalWOs} unique work orders`);
        woEntries.slice(0, 5).forEach(([key, rows]) => {
            console.log(`   Group "${key}": ${rows.length} row(s), jobNo: "${normalizeJobNo(rows[0]?.jobNo || '')}"`);
        });

        emitProgress("awo-progress", { jobId, phase: "starting", current: 0, total: totalWOs });

        for (let i = 0; i < woEntries.length; i++) {
            const entry = woEntries[i];
            if (!entry) continue;

            // Don't destructure the composite grouping key as workOrderNo —
            // the real, plain value (e.g. "3") always comes from the row data.
            const [, woRows] = entry;
            const first = woRows[0];
            if (!first) continue;

            const workOrderNo = first.workOrderNo;
            const normalizedJobNo = normalizeJobNo(first.jobNo);

            console.log(`🔍 Looking up StyleRequirement for jobNo: "${normalizedJobNo}" (from raw: "${first.jobNo}")`);

            try {
                const styleReq = await prisma.styleRequirement.findUnique({
                    where: { jobNo: normalizedJobNo },
                    select: { id: true, jobNo: true },
                });

                if (!styleReq) {
                    const fallbackSearch = await prisma.styleRequirement.findFirst({
                        where: {
                            jobNo: {
                                contains: first.jobNo.replace(/[\\/]/g, ''),
                                mode: 'insensitive'
                            }
                        },
                        select: { id: true, jobNo: true }
                    });

                    if (fallbackSearch) {
                        console.log(`⚠️ Fallback match found: DB has "${fallbackSearch.jobNo}" for input "${first.jobNo}"`);
                    }

                    const msg = `StyleRequirement not found for jobNo "${normalizedJobNo}" (raw: "${first.jobNo}"). ` +
                        `Upload Style Requirement sheet first. ` +
                        `Available in DB: ${fallbackSearch ? `found "${fallbackSearch.jobNo}"` : 'no match'}`;
                    summary.errors.push({ workOrderNo, message: msg });
                    console.error(`❌ ${msg}`);
                    emitProgress("awo-progress", {
                        jobId, phase: "error", current: i + 1, total: totalWOs, workOrderNo, message: msg
                    });
                    continue;
                }

                const jobRecord = await prisma.jobs.findUnique({
                    where: { jobNo: normalizedJobNo },
                    select: { id: true },
                });

                if (!jobRecord) {
                    const msg = `jobs record not found for jobNo "${normalizedJobNo}". Upload Style Requirement sheet first.`;
                    summary.errors.push({ workOrderNo, message: msg });
                    console.error(`❌ ${msg}`);
                    emitProgress("awo-progress", {
                        jobId, phase: "error", current: i + 1, total: totalWOs, workOrderNo, message: msg
                    });
                    continue;
                }

                // Scoped by workOrderNo + jobNo + month, matching buildWOKey,
                // so a plain value like "3" only matches THIS job's work order.
                const existingWO = await prisma.workOrder.findFirst({
                    where: {
                        orderType: "aopOrder",
                        workOrderNo,
                        jobNo: first.jobNo,
                        month: first.month,
                    },
                    orderBy: { id: 'desc' }
                });

                let workOrderId: number;

                await prisma.$transaction(async (tx) => {
                    if (existingWO) {
                        await tx.workOrder.update({
                            where: { id: existingWO.id },
                            data: {
                                workOrderPlaceDate: first.workOrderDate || existingWO.workOrderPlaceDate,
                                month: first.month || existingWO.month,
                                styleNo: first.style || existingWO.styleNo,
                                lotNo: first.poNo || existingWO.lotNo,
                                jobNo: first.jobNo || existingWO.jobNo,
                                orderType: "aopOrder",
                                factoryName: first.awoFactoryName || existingWO.factoryName,
                                styleRequirementId: styleReq.id,
                                jobId: jobRecord.id,
                            }
                        });
                        workOrderId = existingWO.id;
                        summary.workOrdersUpdated++;
                    } else {
                        const newWO = await tx.workOrder.create({
                            data: {
                                workOrderNo,
                                workOrderPlaceDate: first.workOrderDate,
                                month: first.month,
                                styleNo: first.style,
                                lotNo: first.poNo,
                                jobNo: first.jobNo,
                                orderType: "aopOrder",
                                factoryName: first.awoFactoryName,
                                styleRequirementId: styleReq.id,
                                jobId: jobRecord.id,
                            }
                        });
                        workOrderId = newWO.id;
                        summary.workOrdersCreated++;
                    }

                    // Delete old compositions before inserting (prevents duplicates on re-upload)
                    await tx.composition.deleteMany({
                        where: {
                            workOrderId: workOrderId,
                            orderType: "aopOrder"
                        }
                    });

                    const compositionsData = woRows.map(row => ({
                        composition: row.composition || "N/A",
                        unitePrice: Number(row.awoPricePerKg) || 0,
                        color: row.color || "N/A",
                        additional: 0,
                        orderQty: Number(row.awoWorkOrderQty) || 0,
                        workOrderQty: Number(row.awoWorkOrderQty) || 0,
                        workOrderId: workOrderId,
                        orderType: "aopOrder"
                    }));

                    await tx.composition.createMany({ data: compositionsData });
                    summary.compositionsInserted += compositionsData.length;
                });

                emitProgress("awo-progress", {
                    jobId, phase: "inserting", current: i + 1, total: totalWOs, workOrderNo, rowsInGroup: woRows.length
                });

            } catch (err) {
                const message = err instanceof Error ? err.message : "Unknown error";
                summary.errors.push({ workOrderNo, message });
                console.error(`❌ Failed to upsert AWO "${workOrderNo}":`, message);

                emitProgress("awo-progress", {
                    jobId, phase: "error", current: i + 1, total: totalWOs, workOrderNo, message
                });
            }
        }

        emitProgress("awo-complete", { jobId, summary });
        return summary;
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        emitProgress("awo-error", { jobId, message });
        throw err;
    }
};