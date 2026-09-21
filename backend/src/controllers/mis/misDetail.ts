import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";
import { structureKnittingWorkOrder } from "./knittingMisDetailStructer";

export const misDetailView = async (req: Request, res: Response) => {
    const { columnName, jobNo } = req.params as { columnName: string, jobNo: string };

    if (!columnName || !jobNo) {
        return res.status(404).send({ message: "Required fields are missing please try again later.", type: "error" });
    }

    const formattedJobNo = jobNo.replace(/-([^-]*)$/, "/$1");


    try {
        switch (columnName) {
            case "knittingWorkOrder": {
                const knittingOrderData = await prisma.workOrder.findMany({
                    where: { orderType: "knittingOrder", jobNo: formattedJobNo },
                    select: {
                        workOrderNo: true,
                        factoryName: true,
                        compositions: { select: { workOrderQty: true } }
                    }
                });

                const knittingWorkOrderDetail = structureKnittingWorkOrder(knittingOrderData);

                if (knittingWorkOrderDetail.length === 0) {
                    return res.status(404).send({ message: "No data found", type: "error" });
                }

                return res.status(200).send({ data: knittingWorkOrderDetail });
            }
            default:
                return res.status(400).send({ message: `Unknown columnName: ${columnName}`, type: "error" });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: "Something went wrong.", type: "error" });
    }
};

type Kind = "sent" | "returned" | "received" | "other";

type DeliveryGroups = {
    sent: string[];
    returned: string[];
    received: string[];
    other?: string[];
};

// sent = counts as delivered, returned = subtracted from delivered,
// received = comes back from the factory, other = shown as a column only
const DELIVERY_CONFIG: Record<string, DeliveryGroups> = {
    knittingOrder: {
        sent: ["Yarn Delivery"],
        returned: ["Yarn Return"],
        received: ["Grey Fabric Received"],
    },
    dyeingOrder: {
        sent: ["Grey Delivery"],
        returned: ["Grey Return"],
        received: [
            "Grey Received",
            "Received From Compacting",
            "Received From Reprocess",
            "Received From HEAT Set",
            "Received From Trumble",
            "Finish Received",
        ],
    },
    aopOrder: {
        sent: ["Sent For Aop"],
        returned: ["Return From Aop"],
        received: ["Received From Aop"],
    },
    yarnDyeingOrder: {
        sent: ["Yarn Delivery For Yarn Dye"],
        returned: ["Yarn Return From Yarn Dye"],
        received: ["Yarn Received From Yarn Dye", "Finish Received"],
        other: ["Finish Return"],
    },
};

type Column = { deliveryType: string; kind: Kind };

type Acc = {
    woQty: number;
    sent: number;
    returned: number;
    received: number;
    types: Record<string, number>;
    to: Record<string, number>;
};

type Row = {
    workOrderQty: number;
    types: Record<string, number>;
    sentQty: number;
    returnedQty: number;
    receivedQty: number;
    deliveredQty: number;
    pendingQty: number;
    yetToReceive: number;
    toFactory: { factory: string; qty: number }[];
};

type WorkOrderRow = Row & { workOrderNo: string };
type FactoryAcc = { acc: Acc; workOrders: WorkOrderRow[] };

const round = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const clean = (val?: string | null): string => val?.replace(/\s+/g, "") || "Unknown";

// "Sent For Aop", "SentForAop", "sent for aop" all match the same key
const norm = (val?: string | null): string => (val ?? "").replace(/\s+/g, "").toLowerCase();

const addTo = (m: Record<string, number>, key: string, value: number): void => {
    m[key] = (m[key] ?? 0) + value;
};

const newAcc = (): Acc => ({ woQty: 0, sent: 0, returned: 0, received: 0, types: {}, to: {} });

const addAcc = (target: Acc, src: Acc): void => {
    target.woQty += src.woQty;
    target.sent += src.sent;
    target.returned += src.returned;
    target.received += src.received;
    Object.keys(src.types).forEach((k) => addTo(target.types, k, src.types[k] ?? 0));
    Object.keys(src.to).forEach((k) => addTo(target.to, k, src.to[k] ?? 0));
};

const roundMap = (m: Record<string, number>): Record<string, number> => {
    const out: Record<string, number> = {};
    Object.keys(m).forEach((k) => {
        out[k] = round(m[k] ?? 0);
    });
    return out;
};

const toRow = (a: Acc): Row => {
    const delivered = a.sent - a.returned;
    return {
        workOrderQty: round(a.woQty),
        types: roundMap(a.types),
        sentQty: round(a.sent),
        returnedQty: round(a.returned),
        receivedQty: round(a.received),
        deliveredQty: round(delivered),          // sent - returned
        pendingQty: round(a.woQty - delivered),  // negative = over-delivered
        yetToReceive: round(delivered - a.received),
        toFactory: Object.keys(a.to)
            .map((factory) => ({ factory, qty: round(a.to[factory] ?? 0) }))
            .sort((x, y) => y.qty - x.qty),
    };
};

export const misDetailViewByJobNo = async (req: Request, res: Response): Promise<Response> => {
    const { jobNo, orderType } = req.params as { jobNo: string; orderType: string };

    if (!jobNo || !orderType) {
        return res.status(400).send({ message: "Job No and Order Type are required.", type: "error" });
    }

    const config = DELIVERY_CONFIG[orderType];
    if (!config) {
        return res.status(400).send({ message: "Unsupported order type.", type: "error" });
    }

    const columns: Column[] = [];
    const kindByLabel = new Map<string, Kind>();
    const labelByKey = new Map<string, string>(); // normalized name -> column label

    const register = (label: string, kind: Kind): void => {
        const key = norm(label);
        if (labelByKey.has(key)) return;
        labelByKey.set(key, label);
        kindByLabel.set(label, kind);
        columns.push({ deliveryType: label, kind });
    };

    config.sent.forEach((t) => register(t, "sent"));
    config.returned.forEach((t) => register(t, "returned"));
    config.received.forEach((t) => register(t, "received"));
    (config.other ?? []).forEach((t) => register(t, "other"));

    try {
        const workOrders = await prisma.workOrder.findMany({
            where: { jobNo, orderType },
            select: {
                workOrderNo: true,
                factoryName: true,
                compositions: {
                    where: { orderType },
                    select: {
                        workOrderQty: true,
                        // no deliveryType filter, so types missing from the config are not lost
                        deliveries: {
                            select: { deliveryType: true, deliveryQty: true, toFactory: true },
                        },
                    },
                },
            },
        });

        if (workOrders.length === 0) {
            return res.status(404).send({ message: "No data found", type: "error" });
        }

        const jobAcc = newAcc();
        const factories = new Map<string, FactoryAcc>();

        for (const wo of workOrders) {
            const acc = newAcc();

            for (const comp of wo.compositions) {
                acc.woQty += comp.workOrderQty ?? 0;

                for (const d of comp.deliveries) {
                    const qty = d.deliveryQty ?? 0;

                    // Match the config by normalized name. Anything unlisted gets its own "other" column.
                    const key = norm(d.deliveryType);
                    let label = labelByKey.get(key);
                    if (!label) {
                        label = (d.deliveryType ?? "").trim() || "Unknown";
                        register(label, "other");
                        labelByKey.set(key, label);
                    }
                    const kind: Kind = kindByLabel.get(label) ?? "other";

                    addTo(acc.types, label, qty);

                    if (kind === "sent") {
                        acc.sent += qty;
                        addTo(acc.to, clean(d.toFactory), qty);
                    } else if (kind === "returned") {
                        acc.returned += qty;
                    } else if (kind === "received") {
                        acc.received += qty;
                    }
                }
            }

            const factory = clean(wo.factoryName);
            let f = factories.get(factory);
            if (!f) {
                f = { acc: newAcc(), workOrders: [] };
                factories.set(factory, f);
            }

            addAcc(f.acc, acc);
            addAcc(jobAcc, acc);
            f.workOrders.push({ workOrderNo: String(wo.workOrderNo), ...toRow(acc) });
        }

        return res.status(200).send({
            data: {
                jobNo,
                orderType,
                columns,
                summary: toRow(jobAcc),
                factoryWise: Array.from(factories.entries()).map(([factory, f]) => ({
                    factory,
                    ...toRow(f.acc),
                    workOrders: f.workOrders,
                })),
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: "Something went wrong.", type: "error" });
    }
};