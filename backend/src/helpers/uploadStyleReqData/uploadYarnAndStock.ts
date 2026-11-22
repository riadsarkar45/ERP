import type { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";
import { getIO } from "../../middleware/socket.io/socket";

// ==========================================
// Interfaces matching your Excel columns
// ==========================================
export interface YarnStockParsedRow {
    supplierName: string;
    count: string;
    composition: string;
    lotNo: string;
    physicalBalanceQty: string;
}

export interface YdStockParsedRow {
    count: string;
    composition: string;
    buyer: string;
    jobNo: string;
    styleNo: string;
    color: string;
    dyedYarnLot: string;
    yarnDyedStock: string;
}

interface UploadSummary {
    yarnStockInserted: number;
    yarnStockSkipped: number;
    ydStockInserted: number;
    ydStockSkipped: number;
    errors: { rowIndex: number; tableName: string; message: string }[];
}

// ==========================================================================
// YARN STOCK sheet  ->  yarnPoModel / yarnPoItems / spinningYarnMovement
// ==========================================================================
// The sheet is an OPENING STOCK list with no PI / challan numbers, so:
//   one PI   (yarnPoModel)           per supplier             -> keeps supplier name
//   one item (yarnPoItems)           per supplier+count+comp  -> poQty = sum of its lots
//   one movement (spinningYarnMovement) per sheet row         -> "Received From Spinning"
// Re-uploading does NOT double the stock: a supplier whose PI
// (poNo = "OPENING-<SUPPLIER>") already exists is skipped.

// ── Settings you may want to change ──────────────────────────────────────
const OPENING_MOVEMENT_TYPE = "Received From Spinning";
const OPENING_CHALLAN_NO = 0; // marks "opening balance" rows (challanNo is a required Int)
const OPENING_PO_PREFIX = "OPENING-";
const OPENING_LC_NO = "N/A";
const OPENING_REMARKS = "Opening stock imported from YARN STOCK sheet";
const OPENING_PI_IS_AUTHORIZED = true; // set false if opening PIs must go through your approval flow
const MOVEMENT_CHUNK_SIZE = 1000;

interface PlannedMovement {
    itemKey: string;
    lotNo: string;
    yarnCount: string;
    qty: number;
}

interface PlannedPo {
    poNo: string;
    supplierName: string;
    items: Map<string, { yarnCount: string; composition: string; poQty: number }>;
    movements: PlannedMovement[];
}

interface SpinningStockResult {
    posCreated: number;
    itemsCreated: number;
    movementsInserted: number;
    skippedPos: { poNo: string; supplierName: string; rows: number }[];
}

const clean = (v: unknown): string => String(v ?? "").replace(/\s+/g, " ").trim();

const round2 = (n: number): number => Math.round(n * 100) / 100;

const parseQty = (v: unknown): number => {
    if (typeof v === "number") return v;
    return Number(String(v ?? "").replace(/,/g, "").trim());
};

const slugify = (name: string): string =>
    name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "UNKNOWN";

/** Groups sheet rows into supplier PIs -> items -> movements. */
const buildOpeningStockPlan = (rows: YarnStockParsedRow[]): PlannedPo[] => {
    const bySupplier = new Map<string, PlannedPo>();
    const usedPoNos = new Set<string>();

    for (const row of rows) {
        const supplierName = clean(row.supplierName);
        const yarnCount = clean(row.count);
        const composition = clean(row.composition);
        const lotNo = clean(row.lotNo);
        const qty = round2(parseQty(row.physicalBalanceQty));

        if (!supplierName || !yarnCount || !Number.isFinite(qty) || qty <= 0) continue;

        let po = bySupplier.get(supplierName);
        if (!po) {
            const base = `${OPENING_PO_PREFIX}${slugify(supplierName)}`;
            let poNo = base;
            let n = 2;
            while (usedPoNos.has(poNo)) poNo = `${base}-${n++}`;
            usedPoNos.add(poNo);
            po = { poNo, supplierName, items: new Map(), movements: [] };
            bySupplier.set(supplierName, po);
        }

        const itemKey = `${yarnCount}||${composition}`;
        const item = po.items.get(itemKey);
        if (item) item.poQty = round2(item.poQty + qty);
        else po.items.set(itemKey, { yarnCount, composition, poQty: qty });

        po.movements.push({ itemKey, lotNo, yarnCount, qty });
    }

    return [...bySupplier.values()];
};

const uploadSpinningOpeningStock = async (
    rows: YarnStockParsedRow[],
    openingDate: Date = new Date()
): Promise<SpinningStockResult> => {
    const plan = buildOpeningStockPlan(rows);
    const result: SpinningStockResult = { posCreated: 0, itemsCreated: 0, movementsInserted: 0, skippedPos: [] };
    if (plan.length === 0) return result;

    await prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
            // 1. Skip suppliers whose opening PI already exists (keeps re-uploads safe)
            const existing = await tx.yarnPoModel.findMany({
                where: { poNo: { in: plan.map((p) => p.poNo) } },
                select: { poNo: true },
            });
            const existingPoNos = new Set(existing.map((e) => e.poNo));

            const toCreate: PlannedPo[] = [];
            for (const po of plan) {
                if (existingPoNos.has(po.poNo)) {
                    result.skippedPos.push({ poNo: po.poNo, supplierName: po.supplierName, rows: po.movements.length });
                } else {
                    toCreate.push(po);
                }
            }
            if (toCreate.length === 0) return;

            // 2. PIs (one per supplier)
            await tx.yarnPoModel.createMany({
                data: toCreate.map((po) => ({
                    piNo: po.poNo,
                    piDate: openingDate,
                    lcNo: OPENING_LC_NO,
                    poNo: po.poNo,
                    supplierName: po.supplierName,
                    remarks: OPENING_REMARKS,
                    isAuthorized: OPENING_PI_IS_AUTHORIZED,
                })),
            });
            result.posCreated = toCreate.length;

            const createdPos = await tx.yarnPoModel.findMany({
                where: { poNo: { in: toCreate.map((p) => p.poNo) } },
                select: { id: true, poNo: true },
            });
            const poIdByPoNo = new Map(createdPos.map((p) => [p.poNo, p.id]));

            // 3. Items (one per supplier + count + composition)
            const itemRows: { yarnPoId: number; yarnCount: string; composition: string; poQty: number }[] = [];
            for (const po of toCreate) {
                const yarnPoId = poIdByPoNo.get(po.poNo);
                if (yarnPoId === undefined) throw new Error(`PI ${po.poNo} was not created`);
                for (const it of po.items.values()) {
                    itemRows.push({ yarnPoId, yarnCount: it.yarnCount, composition: it.composition, poQty: it.poQty });
                }
            }
            await tx.yarnPoItems.createMany({ data: itemRows });
            result.itemsCreated = itemRows.length;

            const createdItems = await tx.yarnPoItems.findMany({
                where: { yarnPoId: { in: [...poIdByPoNo.values()] } },
                select: { id: true, yarnPoId: true, yarnCount: true, composition: true },
            });
            const itemIdByKey = new Map(
                createdItems.map((i) => [`${i.yarnPoId}||${i.yarnCount}||${i.composition}`, i.id])
            );

            // 4. Movements (one per sheet row) -> "Received From Spinning"
            const movementRows: Prisma.spinningYarnMovementCreateManyInput[] = [];
            for (const po of toCreate) {
                const yarnPoId = poIdByPoNo.get(po.poNo) as number;
                for (const m of po.movements) {
                    const yarnPoItemsId = itemIdByKey.get(`${yarnPoId}||${m.itemKey}`);
                    if (yarnPoItemsId === undefined) throw new Error(`Item missing for ${po.poNo} / ${m.itemKey}`);
                    movementRows.push({
                        yarnPoItemsId,
                        movementType: OPENING_MOVEMENT_TYPE,
                        movementDate: openingDate,
                        movementQty: m.qty,
                        challanNo: OPENING_CHALLAN_NO,
                        lotNo: m.lotNo,
                        yarnCount: m.yarnCount,
                    });
                }
            }
            for (let i = 0; i < movementRows.length; i += MOVEMENT_CHUNK_SIZE) {
                const r = await tx.spinningYarnMovement.createMany({
                    data: movementRows.slice(i, i + MOVEMENT_CHUNK_SIZE),
                });
                result.movementsInserted += r.count;
            }
        },
        { maxWait: 10_000, timeout: 60_000 }
    );

    return result;
};

// ==========================================
// Socket progress helper
// ==========================================
const emitProgress = (event: string, payload: Record<string, unknown>) => {
    const io = getIO();
    if (!io) {
        console.warn(`⚠️ getIO() returned null/undefined — cannot emit '${event}'`, payload);
        return;
    }
    io.emit(event, payload);
};

export const uploadYarnAndYdStockData = async (
    yarnStockRows: YarnStockParsedRow[],
    ydStockRows: YdStockParsedRow[],
    jobId: string,
    _createdBy: number // kept so the controller call stays the same (spinningYarnMovement has no createdBy column)
): Promise<UploadSummary> => {
    const summary: UploadSummary = {
        yarnStockInserted: 0,
        yarnStockSkipped: 0,
        ydStockInserted: 0,
        ydStockSkipped: 0,
        errors: [],
    };

    console.log(`📊 Yarn/YD Import: Received ${yarnStockRows.length} Yarn Stock rows and ${ydStockRows.length} YD Stock rows`);

    try {
        // ==========================================
        // 1. Process Yarn Stock  ->  spinningYarnMovement
        // ==========================================
        if (yarnStockRows.length > 0) {
            emitProgress("yarn-stock-progress", {
                jobId,
                phase: "starting",
                current: 0,
                total: yarnStockRows.length,
            });

            const validYarnRows = yarnStockRows.filter((row, index) => {
                const supplier = row.supplierName?.trim();
                const count = row.count?.trim();

                // Skip empty rows or "N/A" placeholders often found in Excel exports
                if (!supplier || !count || supplier.toLowerCase() === 'n/a' || count.toLowerCase() === 'n/a') {
                    summary.yarnStockSkipped++;
                    summary.errors.push({ rowIndex: index + 1, tableName: "Yarn Stock", message: "Missing or invalid supplierName or count" });
                    return false;
                }

                // A "Received From Spinning" movement needs a positive quantity
                const qty = parseQty(row.physicalBalanceQty);
                if (!Number.isFinite(qty) || qty <= 0) {
                    summary.yarnStockSkipped++;
                    summary.errors.push({ rowIndex: index + 1, tableName: "Yarn Stock", message: "Physical balance qty is missing, zero or not a number" });
                    return false;
                }
                return true;
            });

            console.log(`✅ Yarn Stock: ${validYarnRows.length} valid rows after filtering`);

            const yarnResult = await uploadSpinningOpeningStock(validYarnRows);

            for (const skipped of yarnResult.skippedPos) {
                summary.yarnStockSkipped += skipped.rows;
                summary.errors.push({
                    rowIndex: 0,
                    tableName: "Yarn Stock",
                    message: `Opening PI ${skipped.poNo} (${skipped.supplierName}) already exists — ${skipped.rows} rows skipped`,
                });
            }

            summary.yarnStockInserted = yarnResult.movementsInserted;
            console.log(
                `✅ Yarn Stock: created ${yarnResult.posCreated} PIs, ${yarnResult.itemsCreated} items, ` +
                `${yarnResult.movementsInserted} "Received From Spinning" movements ` +
                `(${yarnResult.skippedPos.length} suppliers skipped, already imported)`
            );

            emitProgress("yarn-stock-progress", {
                jobId,
                phase: "complete",
                current: yarnResult.movementsInserted,
                total: yarnStockRows.length,
            });
        }

        // ==========================================
        // 2. Process YD Stock
        // ==========================================
        if (ydStockRows.length > 0) {
            emitProgress("yd-stock-progress", {
                jobId,
                phase: "starting",
                current: 0,
                total: ydStockRows.length,
            });

            const validYdRows = ydStockRows.filter((row, index) => {
                const count = row.count?.trim();
                const buyer = row.buyer?.trim();
                
                if (!count || !buyer || count.toLowerCase() === 'n/a' || buyer.toLowerCase() === 'n/a') {
                    summary.ydStockSkipped++;
                    summary.errors.push({ rowIndex: index + 1, tableName: "YD Stock", message: "Missing or invalid count or buyer" });
                    return false;
                }
                return true;
            });

            console.log(`✅ YD Stock: ${validYdRows.length} valid rows after filtering`);


            const ydResult = await prisma.ydStock.createMany({
                data: validYdRows.map(row => ({
                    count: row.count.trim(),
                    composition: row.composition ? row.composition.trim() : "",
                    buyer: row.buyer.trim(),
                    jobNo: row.jobNo ? row.jobNo.trim() : "",
                    styleNo: row.styleNo ? row.styleNo.trim() : "",
                    color: row.color ? row.color.trim() : "",
                    dyedYarnLot: row.dyedYarnLot ? row.dyedYarnLot.trim() : "",
                    yarnDyedStock: row.yarnDyedStock ? String(row.yarnDyedStock).trim() : "0",
                })),
            });

            summary.ydStockInserted = ydResult.count;
            console.log(`✅ YD Stock: Successfully inserted ${ydResult.count} rows`);

            emitProgress("yd-stock-progress", {
                jobId,
                phase: "complete",
                current: ydResult.count,
                total: ydStockRows.length,
            });
        }

        emitProgress("yarn-yd-stock-complete", { jobId, summary });
        return summary;

    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`❌ Failed to upload yarn/yd stock data:`, message);
        emitProgress("yarn-yd-stock-error", { jobId, message });
        throw err;
    }
};