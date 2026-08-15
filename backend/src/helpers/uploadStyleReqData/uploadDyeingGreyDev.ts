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

// ── Explicit DB Types to satisfy TypeScript ─────────────────────────
interface CompositionWithWorkOrder {
    id: number;
    color: string;
    composition: string;
    workOrder: {
        factoryName: string | null;
        jobNo: string;
    } | null;
}

interface ChallanRecord {
    id: number;
    challanNo: number;
    toFactory: string | null;
    fromFactory: string | null;
}

interface ChallanCreatePayload {
    challanNo: number;
    challanDate: Date;
    toFactory: string;
    fromFactory: string;
    yarnCompId: number;
}

interface DeliveryCreatePayload {
    deliveryDate: Date;
    challanNo: number;
    deliveryQty: number;
    deliveryType: string;
    yarnId: number;
    yarnCompId: number;
    fromFactory: string;
    toFactory: string;
    challanId: number;
}
// ─────────────────────────────────────────────────────────────────────

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

const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
    const results: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        results.push(array.slice(i, i + chunkSize));
    }
    return results;
};

const getChallanKey = (challanNo: number, toFactory: string | null | undefined, fromFactory: string | null | undefined): string => {
    return `${challanNo}|${(toFactory || '').trim().toLowerCase()}|${(fromFactory || '').trim().toLowerCase()}`;
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

    console.log(`📊 [Dyeing] Received ${rows.length} raw rows`);

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

        if (row.greyDeliveryQty > 0) events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.greyDeliveryQty, deliveryType: "Grey Delivery", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: dyeingFactory, fromFactory: sourceFactory, dyeingFactory: row.dyeingFactoryName });
        if (row.greyReturnFromFactory > 0) events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.greyReturnFromFactory, deliveryType: "Grey Return", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: dyeingFactory, fromFactory: sourceFactory, dyeingFactory: row.dyeingFactoryName });
        if (row.greyReceivedQty > 0) events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.greyReceivedQty, deliveryType: "Grey Received", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: receivingFactory, fromFactory: dyeingFactory, dyeingFactory: row.dyeingFactoryName });
        if (row.finishReceivedQty > 0) events.push({ challanDate: row.challanDate, challanNo: row.challanNo, deliveryQty: row.finishReceivedQty, deliveryType: "Finish Received", jobNo: row.jobNo, color: row.color, composition: row.composition, toFactory: receivingFactory, fromFactory: dyeingFactory, dyeingFactory: row.dyeingFactoryName });
    }

    if (events.length === 0) {
        emitProgress("dyeing-grey-delivery-complete", { jobId, summary });
        return summary;
    }

    console.log(`📊 [Dyeing] Generated ${events.length} delivery events`);
    emitProgress("dyeing-grey-delivery-progress", { jobId, phase: "bulk_processing", current: 0, total: events.length });

    // ═══════════════════════════════════════════════════════════════════
    // 1. BULK FETCH: Compositions (CHUNKED)
    // ═══════════════════════════════════════════════════════════════════
    const uniqueJobNos = [...new Set(events.map(e => e.jobNo))];
    const jobNoChunks = chunkArray(uniqueJobNos, 500);
    const allCandidateCompositions: CompositionWithWorkOrder[] = [];
    
    for (const chunk of jobNoChunks) {
        const comps = await prisma.composition.findMany({
            where: { orderType: "dyeingOrder", workOrder: { jobNo: { in: chunk }, orderType: "dyeingOrder" } },
            select: { id: true, color: true, composition: true, workOrder: { select: { factoryName: true, jobNo: true } } },
        });
        allCandidateCompositions.push(...(comps as unknown as CompositionWithWorkOrder[]));
    }

    const compMap = new Map<string, CompositionWithWorkOrder[]>();
    for (const comp of allCandidateCompositions) {
        const key = `${comp.workOrder?.jobNo || ''}|${normalizeMatchText(comp.color)}|${normalizeMatchText(comp.composition)}`;
        if (!compMap.has(key)) compMap.set(key, []);
        compMap.get(key)!.push(comp);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. RESOLVE: Match Compositions
    // ═══════════════════════════════════════════════════════════════════
    const enrichedEvents: EnrichedEvent[] = [];

    for (const event of events) {
        const key = `${event.jobNo}|${normalizeMatchText(event.color)}|${normalizeMatchText(event.composition)}`;
        const comps = compMap.get(key) || [];
        const targetFactory = normalizeMatchText(event.dyeingFactory);

        let composition = comps.length <= 1 ? comps[0] : comps.find(c => normalizeMatchText(c.workOrder?.factoryName || '') === targetFactory);

        if (!composition) {
            summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message: `No matching Composition for Job ${event.jobNo}` });
            continue;
        }
        enrichedEvents.push({ ...event, compositionId: composition.id });
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. BULK FETCH & CREATE: Challans (WITH 1-BY-1 FALLBACK)
    // ═══════════════════════════════════════════════════════════════════
    const uniqueChallanNos = [...new Set(enrichedEvents.map(e => e.challanNo))];
    const challanNoChunks = chunkArray(uniqueChallanNos, 500);
    const existingChallans: ChallanRecord[] = [];
    
    for (const chunk of challanNoChunks) {
        const challans = await prisma.challan.findMany({ where: { challanNo: { in: chunk } } });
        existingChallans.push(...(challans as unknown as ChallanRecord[]));
    }

    const challanMap = new Map<string, ChallanRecord>();
    for (const c of existingChallans) challanMap.set(getChallanKey(c.challanNo, c.toFactory, c.fromFactory), c);

    const challansToCreate: ChallanCreatePayload[] = [];
    const processedChallanKeys = new Set<string>();

    for (const event of enrichedEvents) {
        const key = getChallanKey(event.challanNo, event.toFactory, event.fromFactory);
        if (!challanMap.has(key) && !processedChallanKeys.has(key)) {
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

    if (challansToCreate.length > 0) {
        const challanChunks = chunkArray(challansToCreate, 100);
        for (let i = 0; i < challanChunks.length; i++) {
            try {
                await prisma.challan.createMany({ data: challanChunks[i] as any }); 
            } catch (err: unknown) {
                const prismaError = err as { code?: string; message?: string };
                if (prismaError.code === 'P2002') {
                    console.warn(`⚠️ [Dyeing] Bulk Challan chunk ${i+1} hit unique constraint. Falling back to 1-by-1.`);
                    const chunk = challanChunks[i];
                    if (chunk) {
                        for (const c of chunk) {
                            try { 
                                await prisma.challan.create({ data: c as any }); 
                            } catch (e: unknown) { 
                                const innerError = e as { code?: string; message?: string };
                                if (innerError.code !== 'P2002') console.error(`❌ [Dyeing] 1-by-1 challan failed:`, innerError.message); 
                            }
                        }
                    }
                } else {
                    console.error(`❌ [Dyeing] Challan chunk ${i+1} failed with real error:`, prismaError.message);
                    throw err; 
                }
            }
        }
        summary.challansCreated = challansToCreate.length;
        
        const allRelevantChallanNos = [...new Set([...existingChallans.map(c => c.challanNo), ...challansToCreate.map(c => c.challanNo)])];
        const reFetchChunks = chunkArray(allRelevantChallanNos, 500);
        const allChallans: ChallanRecord[] = [];
        
        for (const chunk of reFetchChunks) {
            const challans = await prisma.challan.findMany({ where: { challanNo: { in: chunk } } });
            allChallans.push(...(challans as unknown as ChallanRecord[]));
        }
        
        challanMap.clear();
        for (const c of allChallans) challanMap.set(getChallanKey(c.challanNo, c.toFactory, c.fromFactory), c);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. BULK INSERT: Deliveries (WITH 1-BY-1 FALLBACK)
    // ═══════════════════════════════════════════════════════════════════
    const deliveriesToCreate: DeliveryCreatePayload[] = [];
    const skippedDeliveries: number[] = [];

    for (const event of enrichedEvents) {
        const challan = challanMap.get(getChallanKey(event.challanNo, event.toFactory, event.fromFactory));
        if (!challan) { skippedDeliveries.push(event.challanNo); continue; }

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
        console.warn(`⚠️ [Dyeing] Skipped ${skippedDeliveries.length} deliveries due to missing challans: ${[...new Set(skippedDeliveries)].join(', ')}`);
    }

    if (deliveriesToCreate.length > 0) {
        const deliveryChunks = chunkArray(deliveriesToCreate, 100);
        let totalCreated = 0;
        
        for (let i = 0; i < deliveryChunks.length; i++) {
            const chunk = deliveryChunks[i];
            if (!chunk?.length) continue;

            try {
                await prisma.deliveries.createMany({ data: chunk as any });
                totalCreated += chunk.length;
            } catch (err: unknown) {
                const prismaError = err as { code?: string; message?: string };
                if (prismaError.code === 'P2002') {
                    console.warn(`⚠️ [Dyeing] Bulk Delivery chunk ${i+1} hit unique constraint. Falling back to 1-by-1.`);
                    for (const d of chunk) {
                        try { 
                            await prisma.deliveries.create({ data: d as any }); 
                            totalCreated++; 
                        } catch (e: unknown) { 
                            const innerError = e as { code?: string; message?: string };
                            if (innerError.code !== 'P2002') console.error(`❌ [Dyeing] 1-by-1 delivery failed:`, innerError.message); 
                        }
                    }
                } else {
                    console.error(`❌ [Dyeing] Delivery chunk ${i+1} failed with real error:`, prismaError.message);
                    throw err;
                }
            }
        }
        summary.deliveriesCreated = totalCreated;
    }

    console.log(`✅ [Dyeing] Final Summary:`, summary);
    emitProgress("dyeing-grey-delivery-complete", { jobId, summary });
    return summary;
};