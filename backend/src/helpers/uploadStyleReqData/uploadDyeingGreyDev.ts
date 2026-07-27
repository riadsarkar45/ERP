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
    // NEW: the dyeing factory itself (always row.dyeingFactoryName,
    // regardless of which of toFactory/fromFactory it landed in below) —
    // matches WorkOrder.factoryName from the DWO upload, and is what
    // disambiguates a job whose fabric was split across multiple dyeing
    // factories (same color/composition, different factory).
    dyeingFactory: string;
}

const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    io.emit(event, payload);
};

// Same normalization used on the DWO upload side — MUST stay identical
// between the two files or matches will drift again.
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

        // Ensure both factories are populated
        const dyeingFactory = row.dyeingFactoryName || "UNKNOWN DYEING FACTORY";
        const receivingFactory = row.toFactory || "UNKNOWN RECEIVING FACTORY";
        const sourceFactory = row.fromFactory || "UNKNOWN SOURCE FACTORY";

        // 1. GREY DELIVERY (Grey fabric sent to dyeing factory)
        if (row.greyDeliveryQty > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.greyDeliveryQty,
                deliveryType: "Grey Delivery",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: dyeingFactory,
                fromFactory: sourceFactory,
                dyeingFactory: row.dyeingFactoryName,
            });
        }

        // 2. GREY RECEIVED (Dyed grey fabric received back)
        if (row.greyReceivedQty > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.greyReceivedQty,
                deliveryType: "Grey Received",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: receivingFactory,
                fromFactory: dyeingFactory,
                dyeingFactory: row.dyeingFactoryName,
            });
        }

        // 3. FINISH RECEIVED (Finished fabric received back)
        if (row.finishReceivedQty > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.finishReceivedQty,
                deliveryType: "Finish Received",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: receivingFactory,
                fromFactory: dyeingFactory, // Or finishing factory if different
                dyeingFactory: row.dyeingFactoryName,
            });
        }
    }

    console.log(`📊 Dyeing Grey Delivery: ${events.length} delivery events from ${rows.length} valid rows`);
    emitProgress("dyeing-grey-delivery-progress", { jobId, phase: "starting", current: 0, total: events.length });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) continue;

        try {
            const normalizedJobNo = normalizeJobNo(event.jobNo);
            const targetColor = normalizeMatchText(event.color);
            const targetComposition = normalizeMatchText(event.composition);
            const targetFactory = normalizeMatchText(event.dyeingFactory);

            // ── 1. Resolve Composition ──
            // CHANGED: pull ALL candidate compositions for this job/orderType
            // (with their parent WorkOrder's factoryName), then match in JS
            // using normalized text instead of exact Postgres string
            // equality — and disambiguate by factory when a job's fabric
            // was split across multiple dyeing factories with identical
            // color/composition (see DWO upload fix).
            const candidateCompositions = await prisma.composition.findMany({
                where: {
                    orderType: "dyeingOrder",
                    workOrder: {
                        jobNo: event.jobNo,
                        orderType: "dyeingOrder",
                    },
                },
                select: {
                    id: true,
                    workOrderId: true,
                    color: true,
                    composition: true,
                    workOrder: { select: { factoryName: true } },
                },
            });

            const colorCompMatches = candidateCompositions.filter(c =>
                normalizeMatchText(c.color) === targetColor &&
                normalizeMatchText(c.composition) === targetComposition
            );

            let composition = colorCompMatches.length <= 1
                ? colorCompMatches[0]
                : colorCompMatches.find(c => normalizeMatchText(c.workOrder?.factoryName || '') === targetFactory);

            if (!composition) {
                const availablePairs = candidateCompositions
                    .map(c => `color="${c.color}" composition="${c.composition}" factory="${c.workOrder?.factoryName ?? ''}"`)
                    .join(' | ');

                const ambiguityNote = colorCompMatches.length > 1
                    ? ` This job has ${colorCompMatches.length} compositions with matching color/composition across different factories, ` +
                      `but none has factoryName matching delivery row's dyeing factory "${event.dyeingFactory}" — check for a factory name spelling mismatch between the DWO and Delivery sheets.`
                    : '';

                const msg = `No matching Composition found for jobNo "${event.jobNo}" ` +
                    `(normalized: "${normalizedJobNo}"), color "${event.color}", composition "${event.composition}", ` +
                    `factory "${event.dyeingFactory}".${ambiguityNote} ` +
                    `Available compositions for this job: ${availablePairs || 'NONE — upload the DWO sheet first'}.`;
                summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message: msg });
                console.error(`❌ ${msg}`);
                emitProgress("dyeing-grey-delivery-progress", {
                    jobId, phase: "error", current: i + 1, total: events.length,
                    challanNo: event.challanNo, message: msg,
                });
                continue;
            }

            // ── 2. Find or Create Challan (NO UPSERT) ──
            // This prevents accidental overwrites of existing challan data.
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

            // ── 3. Create Delivery Record ──
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

            // Batch progress emits
            if ((i + 1) % 25 === 0 || i === events.length - 1) {
                emitProgress("dyeing-grey-delivery-progress", {
                    jobId, phase: "inserting", current: i + 1, total: events.length,
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message });
            emitProgress("dyeing-grey-delivery-progress", {
                jobId, phase: "error", current: i + 1, total: events.length,
                challanNo: event.challanNo, message,
            });
        }
    }

    emitProgress("dyeing-grey-delivery-complete", { jobId, summary });
    return summary;
};