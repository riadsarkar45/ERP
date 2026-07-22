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
    aopFinishFabricRcvd: number
    aopReceivedFromFactoryName: string;
    aopFabricDeliveryFactoryNameSM: string;
}

interface AOPDeliveryUploadSummary {
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

export const uploadAopDeliveryDataFromFile = async (
    rows: AOPDeliveryParsedRow[],
    jobId: string
): Promise<AOPDeliveryUploadSummary> => {
    const summary: AOPDeliveryUploadSummary = {
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

        // 👇 ADD THIS NEW BLOCK FOR FINISH FABRIC 👇
        if (row.aopFinishFabricRcvd > 0) {
            events.push({
                challanDate: row.challanDate,
                challanNo: row.challanNo,
                deliveryQty: row.aopFinishFabricRcvd,
                deliveryType: "AOP Finish Fabric Rcvd", // 👈 New delivery type string
                jobNo: row.jobNo,
                color: row.color,
                composition: row.composition,
                toFactory: row.aopFabricDeliveryFactoryNameSM, // Adjust if it goes to a different factory
                fromFactory: row.aopReceivedFromFactoryName,
            });
        }
    }

    console.log(`📊 AOP Delivery: ${events.length} delivery events from ${rows.length} valid rows`);

    emitProgress("aop-delivery-progress", { jobId, phase: "starting", current: 0, total: events.length });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (!event) continue;

        try {
            const composition = await prisma.composition.findFirst({
                where: {
                    color: event.color,
                    composition: event.composition,
                    orderType: "aopOrder",
                    workOrder: {
                        jobNo: event.jobNo,
                        orderType: "aopOrder",
                    },
                },
                select: { id: true, workOrderId: true },
            });

            if (!composition) {
                const msg = `No matching A.W.O Composition found for jobNo "${event.jobNo}", color "${event.color}", composition "${event.composition}". Upload the A.W.O sheet first.`;
                summary.errors.push({ challanNo: event.challanNo, deliveryType: event.deliveryType, message: msg });
                console.error(`❌ ${msg}`);
                emitProgress("aop-delivery-progress", {
                    jobId, phase: "error", current: i + 1, total: events.length,
                    challanNo: event.challanNo, message: msg,
                });
                continue;
            }

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