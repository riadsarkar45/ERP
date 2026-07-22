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

export const uploadYarnGreyRcvdDataFromFile = async (
    rows: YarnGreyRcvdParsedRow[],
    jobId: string
): Promise<YarnGreyRcvdUploadSummary> => {
    const summary: YarnGreyRcvdUploadSummary = {
        challansCreated: 0,
        challansUpdated: 0,
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
                emitProgress("yarn-grey-rcvd-progress", {
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