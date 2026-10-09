import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";

type Entity = "sr" | "row" | "comp" | "wo" | "del";
type Level = "sr" | "row" | "comp" | "wo" | "del";
type FieldType = "dimension" | "measure";
type FieldKind = "text" | "number" | "date" | "boolean";

interface FieldDef {
    key: string;
    label: string;
    group: string;
    entity: Entity;
    type: FieldType;
    kind: FieldKind;
    prop?: string;
}

const GROUPS: Record<Entity, string> = {
    sr: "Style Requirement",
    row: "Style Requirement Row",
    comp: "Work Order Composition",
    wo: "Work Order",
    del: "Deliveries",
};

const PREFIX: Record<Entity, string[]> = {
    sr: [],
    row: ["rows"],
    comp: ["rows", "compositions"],
    wo: ["rows", "compositions", "workOrder"],
    del: ["rows", "compositions", "deliveries"],
};

const LEVEL: Record<Entity, Level> = {
    sr: "sr",
    row: "row",
    comp: "comp",
    wo: "wo",
    del: "del",
};

const DEDUPE_KEY: Record<Entity, Level> = {
    sr: "sr",
    row: "row",
    comp: "comp",
    wo: "wo",
    del: "del",
};

const field = (
    key: string,
    label: string,
    entity: Entity,
    type: FieldType = "dimension",
    kind: FieldKind = "text",
    prop?: string
): FieldDef => ({
    key,
    label,
    group: GROUPS[entity],
    entity,
    type,
    kind,
    ...(prop === undefined ? {} : { prop }),
});

const REPORT_FIELDS: FieldDef[] = [
    // Style Requirement
    field("buyerName", "Buyer Name", "sr"),
    field("jobNo", "Job No", "sr"),
    field("salesContact", "Sales Contact", "sr"),
    field("poNo", "PO No", "sr"),
    field("styleNo", "Style No", "sr"),
    field("hodDate", "HOD Date", "sr", "dimension", "date"),
    field("isReconciliationDone", "Reconciliation Done", "sr", "dimension", "boolean"),
    field("jobProcessLoss", "Process Loss % (Job)", "sr", "measure", "number", "processLoss"),

    // Style Requirement Row
    field("orderQty", "Order Qty", "row", "measure", "number"),
    field("color", "Color", "row"),
    field("composition", "Composition", "row"),
    field("finishDia", "Finish Dia", "row"),
    field("finishRequiredQty", "Finish Required Qty", "row", "measure", "number"),
    field("additional", "Additional", "row", "measure", "number"),

    // Work Order Composition
    field("workOrderQty", "Work Order Qty", "comp", "measure", "number"),
    field("compositionOrderQty", "Composition Order Qty", "comp", "measure", "number", "orderQty"),
    field("unitePrice", "Unit Price", "comp", "measure", "number"),
    field("woColor", "Work Order Color", "comp", "dimension", "text", "color"),
    field("woComposition", "Work Order Composition", "comp", "dimension", "text", "composition"),

    // Work Order - FIXED: orderType moved here from comp
    field("workOrderNo", "Work Order No", "wo"),
    field("workOrderPlaceDate", "Work Order Date", "wo"),
    field("month", "Month", "wo"),
    field("factoryName", "Factory Name", "wo"),
    field("yarnCount", "Yarn Count", "wo"),
    field("lotNo", "Lot No", "wo"),
    field("machineDia", "Machine Dia", "wo"),
    field("stichLength", "Stitch Length", "wo"),
    field("isApproved", "Approved", "wo", "dimension", "boolean"),
    field("orderType", "Order Type", "wo"), // FIXED: Now correctly maps to WorkOrder.orderType

    // Deliveries
    field("deliveryDate", "Delivery Date", "del", "dimension", "date"),
    field("deliveryMonth", "Delivery Month", "del"),
    field("challanNo", "Challan No", "del", "dimension", "number"),
    field("deliveryType", "Delivery Type", "del"),
    field("toFactory", "To Factory", "del"),
    field("fromFactory", "From Factory", "del"),
    field("deliveryQty", "Delivery Qty", "del", "measure", "number"),
];

const FIELD_MAP = new Map<string, FieldDef>(REPORT_FIELDS.map((f) => [f.key, f]));

export const getDataSetsObjectKeys = async (_req: Request, res: Response) => {
    return res.json(
        REPORT_FIELDS.map((f) => ({
            key: f.key,
            label: f.label,
            group: f.group,
            type: f.type,
            kind: f.kind,
            level: LEVEL[f.entity],
            dedupeLevel: DEDUPE_KEY[f.entity],
            entity: f.entity,
        }))
    );
};

const buildSelect = (defs: FieldDef[]) => {
    const select: Record<string, any> = { id: true };

    for (const def of defs) {
        let node: Record<string, any> = select;

        for (const relation of PREFIX[def.entity]) {
            if (!node[relation]) {
                node[relation] = { select: { id: true } };
            }
            node = node[relation].select;
        }

        const propName = def.prop ?? def.key;
        node[propName] = true;
    }

    return select;
};

const convertValue = (value: unknown, kind: FieldKind): unknown => {
    if (value === null || value === undefined) return null;
    if (kind === "date") {
        if (value instanceof Date) return value.toISOString().slice(0, 10);
        const str = String(value);
        return str.includes("T") ? str.slice(0, 10) : str;
    }
    if (kind === "boolean") return value ? "Yes" : "No";
    if (kind === "number") {
        const n = Number(value);
        return isNaN(n) ? null : n;
    }
    return value;
};

const parseFields = (raw: unknown): string[] => {
    const list = Array.isArray(raw) ? raw : [raw];
    return list
        .filter((v): v is string => typeof v === "string")
        .flatMap((v) => v.split(","))
        .map((v) => v.trim())
        .filter(Boolean);
};

const readEntity = (def: FieldDef, ctx: { sr: any; row: any; comp: any; del: any }): unknown => {
    const prop = def.prop ?? def.key;
    switch (def.entity) {
        case "sr": return ctx.sr?.[prop] ?? null;
        case "row": return ctx.row?.[prop] ?? null;
        case "comp": return ctx.comp?.[prop] ?? null;
        case "wo": return ctx.comp?.workOrder?.[prop] ?? null;
        case "del": return ctx.del?.[prop] ?? null;
        default: return null;
    }
};

const extractIds = (sr: any, row: any, comp: any, del: any) => {
    return {
        sr: sr?.id ?? null,
        row: row?.id ?? null,
        comp: comp?.id ?? null,
        wo: comp?.workOrder?.id ?? null,
        del: del?.id ?? null,
    };
};

export const getSelectedRowsData = async (req: Request, res: Response) => {
    try {
        const objectName = (req.query.objectName as string) ?? "styleRequirement";
        const requestedFieldKeys = parseFields(req.query.fields);
        const uniqueKeys = [...new Set(requestedFieldKeys)];
        
        const defs = uniqueKeys
            .map((key) => FIELD_MAP.get(key))
            .filter((d): d is FieldDef => Boolean(d));

        if (defs.length === 0) {
            return res.status(400).json({
                message: "No valid fields selected",
                allowedFields: REPORT_FIELDS.map((f) => f.key),
            });
        }

        const take = Math.min(Number(req.query.take) || 50, 10000);

        const dataSet = await prisma.styleRequirement.findMany({
            select: buildSelect(defs),
            take,
        });

        const flat: Record<string, unknown>[] = [];

        for (const sr of dataSet as any[]) {
            const rows: any[] = Array.isArray(sr.rows) && sr.rows.length > 0 ? sr.rows : [null];

            for (const row of rows) {
                const comps: any[] = row && Array.isArray(row.compositions) && row.compositions.length > 0 ? row.compositions : [null];

                for (const comp of comps) {
                    const dels: any[] = comp && Array.isArray(comp.deliveries) && comp.deliveries.length > 0 ? comp.deliveries : [null];

                    for (const del of dels) {
                        const ids = extractIds(sr, row, comp, del);

                        const record: Record<string, unknown> = {
                            _ids: ids,
                            _dedupeInfo: defs.map((def) => ({
                                fieldKey: def.key,
                                dedupeLevel: DEDUPE_KEY[def.entity],
                                entityId: ids[DEDUPE_KEY[def.entity]],
                            })),
                        };

                        for (const def of defs) {
                            const rawValue = readEntity(def, { sr, row, comp, del });
                            record[def.key] = convertValue(rawValue, def.kind);
                        }

                        flat.push(record);
                    }
                }
            }
        }

        return res.json({
            objectName,
            fields: defs.map((d) => d.key),
            count: flat.length,
            data: flat,
            fieldMeta: defs.map((d) => ({
                key: d.key,
                entity: d.entity,
                level: LEVEL[d.entity],
                dedupeLevel: DEDUPE_KEY[d.entity],
                type: d.type,
                kind: d.kind,
            })),
        });
    } catch (error) {
        console.error("Failed to get report studio data:", error);
        return res.status(500).json({ 
            message: "Failed to fetch report data",
            details: error instanceof Error ? error.message : String(error)
        });
    }
};