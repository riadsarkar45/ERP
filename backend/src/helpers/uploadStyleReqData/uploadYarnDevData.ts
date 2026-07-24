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
    existingChallansFound: number; // Renamed from challansUpdated for clarity
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

        // 1. Yarn Delivery
        if (row.yarnDeliveryForKnitting > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.yarnDeliveryForKnitting,
                deliveryType: "Yarn Delivery",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: row.nameOfKnittingFactory,
                fromFactory: "",
            });
        }

        // 2. GREY RECEIVED (QTY)
        if (row.greyReceivedQty > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.greyReceivedQty,
                deliveryType: "Grey Fabric Received",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: "", // Received AT our store/factory
                fromFactory: row.nameOfKnittingFactory, // FROM the knitting factory
            });
        }

        // 3. YARN RETURN
        if (row.yarnReturn > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.yarnReturn,
                deliveryType: "Yarn Return",
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: "", // Returned TO yarn store
                fromFactory: row.nameOfKnittingFactory, // FROM the knitting factory
            });
        }
    }

    console.log(`📊 Yarn & Grey Rcvd: ${events.length} delivery events from ${rows.length} valid rows`);
    emitProgress("yarn-grey-rcvd-progress", { jobId, phase: "starting", current: 0, total: events.length });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) continue;

        try {
            // ── 1. Resolve Composition ──
            const composition = await prisma.composition.findFirst({
                where: {
                    orderType: "knittingOrder",
                    color: event.color,
                    composition: event.composition,
                    workOrder: { jobNo: event.jobNo },
                },
                select: { id: true, workOrderId: true },
            });

            if (!composition) {
                const msg = `No matching Composition found for jobNo "${event.jobNo}", color "${event.color}", composition "${event.composition}".`;
                summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message: msg });
                emitProgress("yarn-grey-rcvd-progress", {
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
                emitProgress("yarn-grey-rcvd-progress", {
                    jobId, phase: "inserting", current: i + 1, total: events.length,
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message });
            emitProgress("yarn-grey-rcvd-progress", {
                jobId, phase: "error", current: i + 1, total: events.length,
                challanNo: event.challanNo, message,
            });
        }
    }

    emitProgress("yarn-grey-rcvd-complete", { jobId, summary });
    return summary;
};