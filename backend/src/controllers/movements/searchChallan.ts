import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

// Robust fuzzy matcher to ensure quantities sum correctly regardless of spaces/casing in DB
function matchDeliveryType(type: string | null | undefined): string | null {
    if (!type) return null;
    const t = type.toLowerCase().replace(/[\s_-]+/g, '');
    
    if (t.includes('sentforaop')) return 'sentForAop';
    if (t.includes('receivefromaop') || t.includes('receivedfromaop') || t.includes('rcvfromaop')) return 'receiveFromAop';
    if (t.includes('returnfromaop')) return 'returnFromAop';
    if (t.includes('finishfabric') || t.includes('aopfinishfabric') || t.includes('finishfabricrcvd')) return 'finishFabricReceived';
    if (t.includes('greyreceived') || t.includes('aopgrey') || t.includes('greyrcvd') || t.includes('greyfabric')) return 'greyReceived';
    
    return null;
}

export const searchChallans = async (req: Request, res: Response) => {
    const challansQuery = req.query.challans;
    if (!challansQuery) {
        return res.status(400).send({ msg: "challans query parameter is required", type: "error" });
    }

    const challans = challansQuery
        .toString()
        .split(",")
        .map((challan) => Number(challan.trim()))
        .filter((challan) => !Number.isNaN(challan));

    if (challans.length === 0) {
        return res.status(400).send({ msg: "No valid challan numbers provided", type: "error" });
    }

    const searchedChallans = await prisma.deliveries.findMany({
        where: {
            challanNo: {
                in: challans,
            },
        },
        select: {
            id: true,
            challanNo: true,
            deliveryType: true,
            fromFactory: true,
            toFactory: true,
            deliveryQty: true,
            deliveryDate: true,
            // workOrder: true, // Uncommented to match challanMovement format
            composition: {
                select: {
                    color: true,
                    workOrderQty: true,
                    unitePrice: true,
                    composition: true,
                }
            },
        },
    });

    const byChallan = new Map();

    (searchedChallans || []).forEach((rec: any) => {
        const challanNo = rec.challanNo;
        if (challanNo === undefined || challanNo === null) return;

        const comp = rec.composition || {};
        const wo = rec.workOrder;

        let workOrderText = "-";
        if (wo) {
            if (typeof wo === 'object' && wo !== null) {
                workOrderText = wo.jobNo || wo.jobNumber || wo.workOrderNo || wo.id || "-";
            } else {
                workOrderText = String(wo);
            }
        }

        if (!byChallan.has(challanNo)) {
            byChallan.set(challanNo, {
                rowKey: String(challanNo),
                id: rec.id ?? challanNo,
                challanNo,
                challanDate: rec.deliveryDate ? new Date(rec.deliveryDate).toISOString().split('T')[0] : "-",
                workOrder: workOrderText,
                workOrderQty: comp.workOrderQty || 0,
                composition: comp.composition || "-",
                color: comp.color || "-",
                toFactory: rec.toFactory || "",
                fromFactory: rec.fromFactory || "",
                unitePrice: Number(comp.unitePrice || rec.unitePrice) || 0,
                deliveryQty: 0,
                sentForAop: 0,
                receiveFromAop: 0,
                returnFromAop: 0,
                finishFabricReceived: 0,
                greyReceived: 0,
            });
        }

        const row = byChallan.get(challanNo);
        const qty = Number(rec.deliveryQty ?? rec.totalQty) || 0;
        row.deliveryQty += qty;

        const field = matchDeliveryType(rec.deliveryType);
        if (field) {
            row[field] += qty;
        }
    });

    const grouped = Array.from(byChallan.values()).map((row: any) => ({
        ...row,
        billingAmount: row.deliveryQty * row.unitePrice,
        paidBillingAmount: row.unitePrice,
    }));

    if (searchedChallans.length === 0) {
        return res.status(404).send({ msg: "No deliveries found for the given challan numbers", type: "error", data: [] });
    }

    // Returns the exact same structure as challanMovement
    return res.status(200).send({ msg: "Deliveries found", type: "success", data: grouped });
};