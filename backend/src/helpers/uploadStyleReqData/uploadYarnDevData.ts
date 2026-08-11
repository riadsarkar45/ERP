import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

// ✅ ONLY the columns you requested + essential metadata
export interface YarnGreyRcvdParsedRow {
    challanDate: Date | null;
    challanNo: number;
    jobNo: string;
    color: string;
    composition: string;
    yarnDeliveryForKnitting: number; // 1. Yarn Delivery
    greyReceivedQty: number;         // 2. GREY RECEIVED (QTY)
    yarnReturn: number;              // 3. YARN RETURN
    nameOfKnittingFactory: string;   // 4. NAME OF KNITTING FACTORY
}

interface YarnGreyRcvdUploadSummary {
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
    knittingFactory: string;
}

interface EnrichedEvent extends DeliveryEvent {
    compositionId: number;
}

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) return;
    io.emit(event, payload);
};

const normalizeMatchText = (value: string): string => {
    if (!value || typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, " ").replace(/[\u200B-\u200D\uFEFF]/g, "").toLowerCase();
};

const normalizeJobNo = (jobNo: string): string => {
    if (!jobNo || typeof jobNo !== 'string') return '';
    return jobNo.trim().replace(/[\\/]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};

export const uploadYarnGreyRcvdDataFromFile = async (
    rows: YarnGreyRcvdParsedRow[],
    jobId: string
): Promise<YarnGreyRcvdUploadSummary> => {
    const summary: YarnGreyRcvdUploadSummary = {
        challansCreated: 0,
        existingChallansFound: 0,
        deliveriesCreated: 0,
        rowsSkipped: 0,
        errors: [],
    };

    console.log(`📊 Yarn & Grey Rcvd: Received ${rows.length} raw rows`);

    const events: DeliveryEvent[] = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.jobNo || !row.challanNo) {
            summary.rowsSkipped++;
            continue;
        }

        if (row.yarnDeliveryForKnitting > 0) {
            events.push({
                challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.yarnDeliveryForKnitting,
                deliveryType: "Yarn Delivery", jobNo: row.jobNo, color: row.color, composition: row.composition,
                toFactory: row.nameOfKnittingFactory, fromFactory: "", knittingFactory: row.nameOfKnittingFactory,
            });
        }
        if (row.greyReceivedQty > 0) {
            events.push({
                challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.greyReceivedQty,
                deliveryType: "Grey Fabric Received", jobNo: row.jobNo, color: row.color, composition: row.composition,
                toFactory: "", fromFactory: row.nameOfKnittingFactory, knittingFactory: row.nameOfKnittingFactory,
            });
        }
        if (row.yarnReturn > 0) {
            events.push({
                challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.yarnReturn,
                deliveryType: "Yarn Return", jobNo: row.jobNo, color: row.color, composition: row.composition,
                toFactory: "", fromFactory: row.nameOfKnittingFactory, knittingFactory: row.nameOfKnittingFactory,
            });
        }
    }

    if (events.length === 0) {
        emitProgress("yarn-grey-rcvd-complete", { jobId, summary });
        return summary;
    }

    emitProgress("yarn-grey-rcvd-progress", { jobId, phase: "bulk_processing", current: 0, total: events.length });

    // ═══════════════════════════════════════════════════════════════════
    // 1. BULK FETCH: Get all Compositions in ONE query
    // ═══════════════════════════════════════════════════════════════════
    const uniqueJobNos = [...new Set(events.map(e => e.jobNo))];
    const allCandidateCompositions = await prisma.composition.findMany({
        where: {
            orderType: "knittingOrder",
            workOrder: { jobNo: { in: uniqueJobNos }, orderType: "knittingOrder" },
        },
        select: {
            id: true,
            color: true,
            composition: true,
            workOrder: { select: { factoryName: true, jobNo: true } },
        },
    });

    const compMap = new Map<string, typeof allCandidateCompositions>();
    for (const comp of allCandidateCompositions) {
        const key = `${comp.workOrder.jobNo}|${normalizeMatchText(comp.color)}|${normalizeMatchText(comp.composition)}`;
        if (!compMap.has(key)) compMap.set(key, []);
        compMap.get(key)!.push(comp);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. RESOLVE: Match Compositions to Events in Memory
    // ═══════════════════════════════════════════════════════════════════
    const enrichedEvents: EnrichedEvent[] = [];

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) continue;

        const key = `${event.jobNo}|${normalizeMatchText(event.color)}|${normalizeMatchText(event.composition)}`;
        const comps = compMap.get(key) || [];
        const targetFactory = normalizeMatchText(event.knittingFactory);

        let composition = comps.length <= 1
            ? comps[0]
            : comps.find(c => normalizeMatchText(c.workOrder?.factoryName || '') === targetFactory);

        if (!composition) {
            const availablePairs = comps.map(c => `color="${c.color}" composition="${c.composition}" factory="${c.workOrder?.factoryName ?? ''}"`).join(' | ');
            const ambiguityNote = comps.length > 1
                ? ` This job has ${comps.length} compositions with matching color/composition across different factories, ` +
                  `but none has factoryName matching delivery row's knitting factory "${event.knittingFactory}" — check for a factory name spelling mismatch between the KWO and Delivery sheets.`
                : '';

            const normalizedJobNo = normalizeJobNo(event.jobNo);
            const msg = `No matching Composition found for jobNo "${event.jobNo}" ` +
                `(normalized: "${normalizedJobNo}"), color "${event.color}", composition "${event.composition}", ` +
                `factory "${event.knittingFactory}".${ambiguityNote} ` +
                `Available compositions for this job: ${availablePairs || 'NONE — upload the KWO sheet first'}.`;
            
            summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message: msg });
            continue;
        }

        enrichedEvents.push({ ...event, compositionId: composition.id });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. BULK FETCH & CREATE: Challans
    // ═══════════════════════════════════════════════════════════════════
    const uniqueChallanNos = [...new Set(enrichedEvents.map(e => e.challanNo))];
    const existingChallans = await prisma.challan.findMany({
        where: { challanNo: { in: uniqueChallanNos } }
    });

    const challanMap = new Map<string, any>();
    for (const c of existingChallans) {
        challanMap.set(`${c.challanNo}_${c.toFactory}_${c.fromFactory}`, c);
    }
    summary.existingChallansFound = existingChallans.length;

    const challansToCreate = [];
    const processedChallanKeys = new Set<string>();

    for (const event of enrichedEvents) {
        const key = `${event.challanNo}_${event.toFactory}_${event.fromFactory}`;
        if (!challanMap.has(key) && !processedChallanKeys.has(key)) {
            challansToCreate.push({
                challanNo: event.challanNo,
                challanDate: event.challanDate ?? new Date(),
                toFactory: event.toFactory,
                fromFactory: event.fromFactory,
                yarnCompId: event.compositionId,
            });
            processedChallanKeys.add(key);
        }
    }

    if (challansToCreate.length > 0) {
        await prisma.challan.createMany({ data: challansToCreate, skipDuplicates: true });
        summary.challansCreated = challansToCreate.length;
        
        // Re-fetch to get IDs for newly created challans
        const allRelevantChallanNos = [...new Set([...existingChallans.map(c => c.challanNo), ...challansToCreate.map(c => c.challanNo)])];
        const allChallans = await prisma.challan.findMany({ where: { challanNo: { in: allRelevantChallanNos } } });
        challanMap.clear();
        for (const c of allChallans) {
            challanMap.set(`${c.challanNo}_${c.toFactory}_${c.fromFactory}`, c);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. BULK INSERT: Deliveries
    // ═══════════════════════════════════════════════════════════════════
    const deliveriesToCreate = enrichedEvents.map(event => {
        const key = `${event.challanNo}_${event.toFactory}_${event.fromFactory}`;
        const challan = challanMap.get(key);
        
        return {
            deliveryDate: event.challanDate ?? new Date(),
            challanNo: event.challanNo,
            deliveryQty: event.deliveryQty,
            deliveryType: event.deliveryType,
            yarnId: event.compositionId,
            yarnCompId: event.compositionId,
            fromFactory: event.fromFactory,
            toFactory: event.toFactory,
            challanId: challan ? challan.id : null,
        };
    }).filter(d => d.challanId !== null);

    if (deliveriesToCreate.length > 0) {
        const result = await prisma.deliveries.createMany({ 
            data: deliveriesToCreate,
            skipDuplicates: true 
        });
        summary.deliveriesCreated = result.count;
    }

    emitProgress("yarn-grey-rcvd-complete", { jobId, summary });
    return summary;
};