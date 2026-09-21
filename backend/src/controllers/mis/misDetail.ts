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

// sent = counts as delivered, returned = subtracted from delivered,
// received = comes back from the factory, other = shown as a column only
const DELIVERY_CONFIG: Record<string, { sent: string[]; returned: string[]; received: string[]; other?: string[] }> = {
    knittingOrder: {
        sent: ["Yarn Delivery"],
        returned: ["Yarn Return"],
        received: ["Grey Fabric Received"],
    },
    dyeingOrder: {
        sent: ["Grey Delivery"],
        returned: ["Grey Return"],
        received: ["Grey Received", "Received From Compacting", "Received From Reprocess", "Received From HEAT Set", "Received From Trumble"],
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

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clean = (val?: string | null) => (val?.replace(/\s+/g, "") || "") || "Unknown";
const addTo = (m: Record<string, number>, k: string, v: number) => {
    m[k] = (m[k] || 0) + v;
};

type Acc = {
    woQty: number;
    sent: number;
    returned: number;
    received: number;
    types: Record<string, number>;
    to: Record<string, number>;
};
const newAcc = (): Acc => ({ woQty: 0, sent: 0, returned: 0, received: 0, types: {}, to: {} });

const addAcc = (target: Acc, src: Acc) => {
    target.woQty += src.woQty;
    target.sent += src.sent;
    target.returned += src.returned;
    target.received += src.received;
    for (const [k, v] of Object.entries(src.types)) addTo(target.types, k, v);
    for (const [k, v] of Object.entries(src.to)) addTo(target.to, k, v);
};

// Turns an accumulator into the row shape the frontend uses (work order, factory and job level)
const toRow = (a: Acc) => {
    const delivered = a.sent - a.returned;
    return {
        workOrderQty: round(a.woQty),
        types: Object.fromEntries(Object.entries(a.types).map(([k, v]) => [k, round(v)])),
        sentQty: round(a.sent),
        returnedQty: round(a.returned),
        receivedQty: round(a.received),
        deliveredQty: round(delivered),                    // sent - returned
        pendingQty: round(a.woQty - delivered),            // negative = over-delivered
        yetToReceive: round(delivered - a.received),
        toFactory: Object.entries(a.to)
            .map(([factory, qty]) => ({ factory, qty: round(qty) }))
            .sort((x, y) => y.qty - x.qty),
    };
};

export const misDetailViewByJobNo = async (req: Request, res: Response) => {
    const { jobNo, orderType } = req.params as { jobNo: string; orderType: string };

    if (!jobNo || !orderType) {
        return res.status(400).send({ message: "Job No and Order Type are required.", type: "error" });
    }

    const config = DELIVERY_CONFIG[orderType];
    if (!config) {
        return res.status(400).send({ message: "Unsupported order type.", type: "error" });
    }

    const kindOf = new Map<string, Kind>();
    config.sent.forEach((t) => kindOf.set(t, "sent"));
    config.returned.forEach((t) => kindOf.set(t, "returned"));
    config.received.forEach((t) => kindOf.set(t, "received"));
    (config.other ?? []).forEach((t) => kindOf.set(t, "other"));

    // Every delivery type becomes a table column, in config order
    const columns = Array.from(kindOf.entries()).map(([deliveryType, kind]) => ({ deliveryType, kind }));
    const allTypes = columns.map((c) => c.deliveryType);

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
                        deliveries: {
                            where: { deliveryType: { in: allTypes } },
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
        const factories: Record<string, { acc: Acc; workOrders: ({ workOrderNo: string } & ReturnType<typeof toRow>)[] }> = {};

        for (const wo of workOrders) {
            const acc = newAcc();

            for (const comp of wo.compositions) {
                acc.woQty += comp.workOrderQty ?? 0;

                for (const d of comp.deliveries) {
                    const qty = d.deliveryQty ?? 0;
                    const kind = kindOf.get(d.deliveryType) ?? "other";

                    addTo(acc.types, d.deliveryType, qty);

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
            const f = (factories[factory] ??= { acc: newAcc(), workOrders: [] });
            addAcc(f.acc, acc);
            addAcc(jobAcc, acc);
            f.workOrders.push({ workOrderNo: wo.workOrderNo, ...toRow(acc) });
        }

        return res.status(200).send({
            data: {
                jobNo,
                orderType,
                columns,                       // [{ deliveryType, kind }]
                summary: toRow(jobAcc),        // job totals
                factoryWise: Object.entries(factories).map(([factory, f]) => ({
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