import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

export interface DyeingGreyDeliveryParsedRow {
    challanDate: Date | null;
    challanNo: number;
    jobNo: string;
    color: string;
    composition: string;
    greyDeliveryQty: number;
    greyReceivedQty: number;
    finishReceivedQty: number;
    dyeingFactoryName: string;
    toFactory: string;
    fromFactory: string;
    greyReturnFromFactory: number;
}

interface DyeingGreyDeliveryUploadSummary {
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
    dyeingFactory: string;
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

export const uploadDyeingGreyDeliveryDataFromFile = async (
    rows: DyeingGreyDeliveryParsedRow[],
    jobId: string
): Promise<DyeingGreyDeliveryUploadSummary> => {
    const summary: DyeingGreyDeliveryUploadSummary = {
        challansCreated: 0,
        existingChallansFound: 0,
        deliveriesCreated: 0,
        rowsSkipped: 0,
        errors: [],
    };

    console.log(`📊 Dyeing Grey Delivery: Received ${rows.length} raw rows`);

    const events: DeliveryEvent[] = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.jobNo || !row.challanNo) {
            summary.rowsSkipped++;
            continue;
        }

        const dyeingFactory = row.dyeingFactoryName || "UNKNOWN DYEING FACTORY";
        const receivingFactory = row.toFactory || "UNKNOWN RECEIVING FACTORY";
        const sourceFactory = row.fromFactory || "UNKNOWN SOURCE FACTORY";

        if (row.greyDeliveryQty > 0) {
            events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.greyDeliveryQty, deliveryType: "Grey Delivery", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: dyeingFactory, fromFactory: sourceFactory, dyeingFactory: row.dyeingFactoryName });
        }
        if (row.greyReturnFromFactory > 0) {
            events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.greyReturnFromFactory, deliveryType: "Grey Return", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: dyeingFactory, fromFactory: sourceFactory, dyeingFactory: row.dyeingFactoryName });
        }
        if (row.greyReceivedQty > 0) {
            events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.greyReceivedQty, deliveryType: "Grey Received", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: receivingFactory, fromFactory: dyeingFactory, dyeingFactory: row.dyeingFactoryName });
        }
        if (row.finishReceivedQty > 0) {
            events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.finishReceivedQty, deliveryType: "Finish Received", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: receivingFactory, fromFactory: dyeingFactory, dyeingFactory: row.dyeingFactoryName });
        }
    }

    if (events.length === 0) {
        emitProgress("dyeing-grey-delivery-complete", { jobId, summary });
        return summary;
    }

    emitProgress("dyeing-grey-delivery-progress", { jobId, phase: "bulk_processing", current: 0, total: events.length });

    // ═══════════════════════════════════════════════════════════════════
    // 1. BULK FETCH: Get all Compositions in ONE query
    // ═══════════════════════════════════════════════════════════════════
    const uniqueJobNos = [...new Set(events.map(e => e.jobNo))];
    const allCandidateCompositions = await prisma.composition.findMany({
        where: {
            orderType: "dyeingOrder",
            workOrder: { jobNo: { in: uniqueJobNos }, orderType: "dyeingOrder" },
        },
        select: {
            id: true,
            color: true,
            composition: true,
            workOrder: { select: { factoryName: true, jobNo: true } },
        },
    });

    // Map for O(1) lookups: `jobNo|normalizedColor|normalizedComposition`
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
        const targetFactory = normalizeMatchText(event.dyeingFactory);

        let composition = comps.length <= 1
            ? comps[0]
            : comps.find(c => normalizeMatchText(c.workOrder?.factoryName || '') === targetFactory);

        if (!composition) {
            const availablePairs = comps.map(c => `color="${c.color}" composition="${c.composition}" factory="${c.workOrder?.factoryName ?? ''}"`).join(' | ');
            const msg = `No matching Composition found for jobNo "${event.jobNo}", color "${event.color}", composition "${event.composition}", factory "${event.dyeingFactory}". Available: ${availablePairs || 'NONE'}`;
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

    emitProgress("dyeing-grey-delivery-complete", { jobId, summary });
    return summary;
};