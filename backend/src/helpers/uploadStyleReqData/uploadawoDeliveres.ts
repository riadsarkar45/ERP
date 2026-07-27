import prisma from "../../database/prismaClient/prisma"; // ⚠️ Adjust path to your Prisma client
import { getIO } from "../../middleware/socket.io/socket"; // ⚠️ Adjust path to your Socket.IO helper

export interface AOPDeliveryParsedRow {
    challanDate: Date | null;
    challanNo: number;
    month: string;
    salesContractNo: string;
    buyer: string;
    jobNo: string;
    poNo: string;
    style: string;
    color: string;
    composition: string;
    deliveryForAop: number;
    afterAopFabricRcvd: number;
    aopFinishFabricRcvd: number;
    aopReceivedFromFactoryName: string;
    aopFabricDeliveryFactoryNameSM: string;
    fabricReturnFromAop: number
}

interface AOPDeliveryUploadSummary {
    challansCreated: number;
    existingChallansFound: number;
    deliveriesCreated: number;
    rowsSkipped: number;
    errors: { challanNo: number; deliveryType: string; message: string }[];
}

interface DeliveryEvent {
    challanDate: Date | null;
    challanNo: number;
    deliveryQty: number;
    deliveryType: string;
    jobNo: string;
    color: string;
    composition: string;
    toFactory: string;
    fromFactory: string;
}

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    io.emit(event, payload);
};

// NEW: same normalization used on the AWO side — MUST stay identical between
// the two files or matches will drift again. Consider moving this to a
// shared /utils/textNormalize.ts and importing it in both places.
const normalizeMatchText = (value: string): string => {
    if (!value || typeof value !== 'string') return '';
    return value
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .toLowerCase();
};

const normalizeJobNo = (jobNo: string): string => {
    if (!jobNo || typeof jobNo !== 'string') return '';
    return jobNo.trim().replace(/[\\/]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};

export const uploadAopDeliveryDataFromFile = async (
    rows: AOPDeliveryParsedRow[],
    jobId: string
): Promise<AOPDeliveryUploadSummary> => {
    const summary: AOPDeliveryUploadSummary = {
        challansCreated: 0,
        existingChallansFound: 0,
        deliveriesCreated: 0,
        rowsSkipped: 0,
        errors: [],
    };

    console.log(`📊 AOP Delivery: Received ${rows.length} raw rows`);

    const events: DeliveryEvent[] = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.jobNo || !row.challanNo) {
            summary.rowsSkipped++;
            continue;
        }

        if (row.deliveryForAop > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.deliveryForAop,
                deliveryType: "Sent For Aop",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: row.aopReceivedFromFactoryName,
                fromFactory: "",
            });
        }

        if (row.afterAopFabricRcvd > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.afterAopFabricRcvd,
                deliveryType: "Received From Aop",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: row.aopFabricDeliveryFactoryNameSM,
                fromFactory: row.aopReceivedFromFactoryName,
            });
        }

        if (row.aopFinishFabricRcvd > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.aopFinishFabricRcvd,
                deliveryType: "AOP Finish Fabric Rcvd",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: row.aopFabricDeliveryFactoryNameSM,
                fromFactory: row.aopReceivedFromFactoryName,
            });
        }

        if (row.fabricReturnFromAop > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.fabricReturnFromAop,
                deliveryType: "Return From Aop",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: row.aopFabricDeliveryFactoryNameSM,
                fromFactory: row.aopReceivedFromFactoryName,
            });
        }
    }

    emitProgress("aop-delivery-progress", { jobId, phase: "starting", current: 0, total: events.length });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) continue;

        try {
            const normalizedJobNo = normalizeJobNo(event.jobNo);
            const targetColor = normalizeMatchText(event.color);
            const targetComposition = normalizeMatchText(event.composition);

            // ── 1. Resolve Composition ──
            // CHANGED: pull ALL candidate compositions for this job/orderType,
            // then match in JS using the same normalization as the AWO insert
            // side, instead of relying on Postgres exact string equality.
            // This is what was silently failing before on whitespace/case drift.
            const candidateCompositions = await prisma.composition.findMany({
                where: {
                    orderType: "aopOrder",
                    workOrder: {
                        jobNo: event.jobNo,
                        orderType: "aopOrder",
                    },
                },
                select: {
                    id: true,
                    workOrderId: true,
                    color: true,
                    composition: true,
                    styleRequirementRowId: true, // NEW: prefer FK match when present
                },
            });

            let composition = candidateCompositions.find(c =>
                normalizeMatchText(c.color) === targetColor &&
                normalizeMatchText(c.composition) === targetComposition
            );

            if (!composition) {
                const availablePairs = candidateCompositions
                    .map(c => `color="${c.color}" composition="${c.composition}"`)
                    .join(' | ');

                const msg = `No matching A.W.O Composition found for jobNo "${event.jobNo}" ` +
                    `(normalized: "${normalizedJobNo}"), color "${event.color}", composition "${event.composition}". ` +
                    `Available compositions for this job: ${availablePairs || 'NONE — upload the A.W.O sheet first'}.`;
                summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message: msg });
                console.error(`❌ ${msg}`);
                emitProgress("aop-delivery-progress", {
                    jobId, phase: "error", current: i + 1, total: events.length,
                    challanNo: event.challanNo, message: msg,
                });
                continue;
            }

            // ── 2. Find or Create Challan (NO UPSERT) ──
            let challan = await prisma.challan.findUnique({
                where: {
                    challanNo_toFactory_fromFactory: {
                        challanNo: event.challanNo,
                        toFactory: event.toFactory,
                        fromFactory: event.fromFactory,
                    },
                },
            });

            if (!challan) {
                challan = await prisma.challan.create({
                    data: {
                        challanNo: event.challanNo,
                        challanDate: event.challanDate ?? new Date(),
                        toFactory: event.toFactory,
                        fromFactory: event.fromFactory,
                        yarnCompId: composition.id,
                    },
                });
                summary.challansCreated++;
            } else {
                summary.existingChallansFound++;
            }

            // ── 3. Create Delivery Record (Linked to Challan) ──
            await prisma.deliveries.create({
                data: {
                    deliveryDate: event.challanDate ?? new Date(),
                    challanNo: event.challanNo,
                    deliveryQty: event.deliveryQty,
                    deliveryType: event.deliveryType,
                    yarnId: composition.id,
                    yarnCompId: composition.id,
                    fromFactory: event.fromFactory,
                    toFactory: event.toFactory,
                    challanId: challan.id,
                },
            });
            summary.deliveriesCreated++;

            if ((i + 1) % 25 === 0 || i === events.length - 1) {
                emitProgress("aop-delivery-progress", {
                    jobId, phase: "inserting", current: i + 1, total: events.length,
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message });
            console.error(`❌ Failed to insert delivery (challan ${event.challanNo}, ${event.deliveryType}):`, message);

            emitProgress("aop-delivery-progress", {
                jobId, phase: "error", current: i + 1, total: events.length,
                challanNo: event.challanNo, message,
            });
        }
    }

    emitProgress("aop-delivery-complete", { jobId, summary });
    return summary;
};