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
    finishReceivedQty: number; // ✅ ADDED
    dyeingFactoryName: string;
    toFactory: string;
    fromFactory: string;
}

interface DyeingGreyDeliveryUploadSummary {
    challansCreated: number;
    challansUpdated: number;
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

export const uploadDyeingGreyDeliveryDataFromFile = async (
    rows: DyeingGreyDeliveryParsedRow[],
    jobId: string
): Promise<DyeingGreyDeliveryUploadSummary> => {
    const summary: DyeingGreyDeliveryUploadSummary = {
        challansCreated: 0,
        challansUpdated: 0,
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
            });
        }

        // 3. FINISH RECEIVED (Finished fabric received back) ✅ ADDED
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
            });
        }
    }

    console.log(`📊 Dyeing Grey Delivery: ${events.length} delivery events from ${rows.length} valid rows`);
    emitProgress("dyeing-grey-delivery-progress", { jobId, phase: "starting", current: 0, total: events.length });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) continue;

        try {
            // Resolve Composition
            const composition = await prisma.composition.findFirst({
                where: {
                    color: event.color,
                    composition: event.composition,
                    workOrder: { jobNo: event.jobNo },
                },
                select: { id: true },
            });

            if (!composition) {
                const msg = `No matching Composition found for jobNo "${event.jobNo}", color "${event.color}", composition "${event.composition}".`;
                summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message: msg });
                emitProgress("dyeing-grey-delivery-progress", {
                    jobId, phase: "error", current: i + 1, total: events.length,
                    challanNo: event.challanNo, message: msg,
                });
                continue;
            }

            // Universal Challan Upsert
            const challan = await prisma.challan.upsert({
                where: {
                    challanNo_toFactory_fromFactory: {
                        challanNo: event.challanNo,
                        toFactory: event.toFactory,
                        fromFactory: event.fromFactory,
                    },
                },
                update: {
                    challanDate: event.challanDate ?? new Date(),
                    yarnCompId: composition.id,
                },
                create: {
                    challanNo: event.challanNo,
                    challanDate: event.challanDate ?? new Date(),
                    toFactory: event.toFactory,
                    fromFactory: event.fromFactory,
                    yarnCompId: composition.id,
                },
            });

            const createdRecently = (new Date().getTime() - challan.createdAt.getTime()) < 2000;
            if (createdRecently) summary.challansCreated++;
            else summary.challansUpdated++;

            // Create Delivery Record
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