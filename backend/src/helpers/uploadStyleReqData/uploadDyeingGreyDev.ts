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

// ✅ HELPER: Breaks large arrays into smaller batches to prevent Postgres parameter limits & RAM crashes
const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        results.push(array.slice(i, i + chunkSize));
    }
    return results;
};

// ✅ HELPER: Safely generates matching keys to prevent silent skipping due to whitespace/nulls
const getChallanKey = (challanNo: number, toFactory: string | null | undefined, fromFactory: string | null | undefined) => {
    return `${challanNo}|${(toFactory || '').trim()}|${(fromFactory || '').trim()}`;
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
    // 1. BULK FETCH: Compositions (CHUNKED to prevent RAM/Postgres crash)
    // ═══════════════════════════════════════════════════════════════════
    const uniqueJobNos = [...new Set(events.map(e => e.jobNo))];
    const jobNoChunks = chunkArray(uniqueJobNos, 500);
    const allCandidateCompositions: any[] = [];
    
    for (const chunk of jobNoChunks) {
        const comps = await prisma.composition.findMany({
            where: {
                orderType: "dyeingOrder",
                workOrder: { jobNo: { in: chunk }, orderType: "dyeingOrder" },
            },
            select: {
                id: true,
                color: true,
                composition: true,
                workOrder: { select: { factoryName: true, jobNo: true } },
            },
        });
        allCandidateCompositions.push(...comps);
    }

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
    // 3. BULK FETCH & CREATE: Challans (CHUNKED & SAFE KEYS)
    // ═══════════════════════════════════════════════════════════════════
    const uniqueChallanNos = [...new Set(enrichedEvents.map(e => e.challanNo))];
    const challanNoChunks = chunkArray(uniqueChallanNos, 500);
    const existingChallans: any[] = [];
    
    for (const chunk of challanNoChunks) {
        const challans = await prisma.challan.findMany({
            where: { challanNo: { in: chunk } }
        });
        existingChallans.push(...challans);
    }

    const challanMap = new Map<string, any>();
    for (const c of existingChallans) {
        challanMap.set(getChallanKey(c.challanNo, c.toFactory, c.fromFactory), c);
    }

    const challansToCreate: any[] = [];
    const processedChallanKeys = new Set<string>();
    const reusedChallanNumbers = new Set<number>();

    for (const event of enrichedEvents) {
        const key = getChallanKey(event.challanNo, event.toFactory, event.fromFactory);
        
        if (challanMap.has(key)) {
            reusedChallanNumbers.add(event.challanNo);
        } else if (!processedChallanKeys.has(key)) {
            challansToCreate.push({
                challanNo: event.challanNo,
                challanDate: event.challanDate ?? new Date(),
                toFactory: (event.toFactory || '').trim(),
                fromFactory: (event.fromFactory || '').trim(),
                yarnCompId: event.compositionId,
            });
            processedChallanKeys.add(key);
        }
    }

    if (reusedChallanNumbers.size > 0) {
        console.log(`ℹ️ [Dyeing] Reusing ${reusedChallanNumbers.size} existing challans: ${Array.from(reusedChallanNumbers).join(', ')}`);
    }

    if (challansToCreate.length > 0) {
        const challanChunks = chunkArray(challansToCreate, 500);
        for (const chunk of challanChunks) {
            // skipDuplicates: true is CRITICAL to prevent P2002 crashes
            await prisma.challan.createMany({ data: chunk, skipDuplicates: true }); 
        }
        summary.challansCreated = challansToCreate.length;
        
        // Re-fetch to get IDs for newly created challans (Chunked)
        const allRelevantChallanNos = [...new Set([...existingChallans.map(c => c.challanNo), ...challansToCreate.map(c => c.challanNo)])];
        const reFetchChunks = chunkArray(allRelevantChallanNos, 500);
        const allChallans: any[] = [];
        for (const chunk of reFetchChunks) {
            const challans = await prisma.challan.findMany({ where: { challanNo: { in: chunk } } });
            allChallans.push(...challans);
        }
        challanMap.clear();
        for (const c of allChallans) {
            challanMap.set(getChallanKey(c.challanNo, c.toFactory, c.fromFactory), c);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. BULK INSERT: Deliveries (TRACKING SKIPPED CHALLANS)
    // ═══════════════════════════════════════════════════════════════════
    const deliveriesToCreate: any[] = [];
    const skippedDeliveries: { challanNo: number; deliveryType: string; key: string }[] = [];

    for (const event of enrichedEvents) {
        const key = getChallanKey(event.challanNo, event.toFactory, event.fromFactory);
        const challan = challanMap.get(key);

        if (!challan) {
            skippedDeliveries.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, key });
            continue;
        }

        deliveriesToCreate.push({
            deliveryDate: event.challanDate ?? new Date(),
            challanNo: event.challanNo,
            deliveryQty: event.deliveryQty,
            deliveryType: event.deliveryType,
            yarnId: event.compositionId,
            yarnCompId: event.compositionId,
            fromFactory: (event.fromFactory || '').trim(),
            toFactory: (event.toFactory || '').trim(),
            challanId: challan.id,
        });
    }

    if (skippedDeliveries.length > 0) {
        const skippedChallanNos = [...new Set(skippedDeliveries.map(s => s.challanNo))];
        console.warn(`⚠️ [Dyeing] Skipped ${skippedDeliveries.length} deliveries. Missing Challans: ${skippedChallanNos.join(', ')}`);
        summary.errors.push({
            challanNo: 0,
            deliveryType: "Skipped Deliveries",
            message: `Dropped ${skippedDeliveries.length} deliveries because challan wasn't found. Challan Numbers: ${skippedChallanNos.join(', ')}`
        });
    }

    if (deliveriesToCreate.length > 0) {
        const deliveryChunks = chunkArray(deliveriesToCreate, 500);
        let totalCreated = 0;
        
        for (const chunk of deliveryChunks) {
            const result = await prisma.deliveries.createMany({ 
                data: chunk, 
                skipDuplicates: true 
            });
            totalCreated += result.count;
        }
        summary.deliveriesCreated = totalCreated;
    }

    emitProgress("dyeing-grey-delivery-complete", { jobId, summary });
    return summary;
};