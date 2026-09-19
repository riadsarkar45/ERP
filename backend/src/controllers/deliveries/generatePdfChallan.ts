import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import prisma from "../../database/prismaClient/prisma";

interface ChallanIdResponse {
    success: boolean;
    message?: string;
}

interface GeneratePdfChallanFailureResponse extends ChallanIdResponse {
    success: false;
    message: string;
}

interface ChallanData {
    yarnId: number;
    lastInsertedId: number | null;
    userId: number;
    queuedAt: number; // ms timestamp, used to expire stale entries
}

/* -------------------------------------------------------------------------- */
/*  In-memory queue                                                           */
/*  Still in memory (so no frontend / schema change is needed), but now:      */
/*   - every read is scoped to ONE user                                       */
/*   - entries are removed after a successful download                        */
/*   - duplicates are ignored and stale entries expire                        */
/*  NOTE: this is still lost on a Render restart/deploy. For a fully stateless*/
/*  flow, call GET /download?deliveryIds=1,2,3 (supported below).             */
/* -------------------------------------------------------------------------- */
const QUEUE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TZ = "Asia/Dhaka";

const yarnAndUserIds: ChallanData[] = [];

const purgeExpired = () => {
    const cutoff = Date.now() - QUEUE_TTL_MS;
    for (let i = yarnAndUserIds.length - 1; i >= 0; i--) {
        const entry = yarnAndUserIds[i];
        if (entry && entry.queuedAt < cutoff) yarnAndUserIds.splice(i, 1);
    }
};

export const generatePdfChallan = (
    yarnId: number,
    lastInsertedId: number | null,
    userId: number
): ChallanData[] | GeneratePdfChallanFailureResponse => {
    if (!yarnId) {
        return {
            success: false,
            message: `Challan id hasn't reached to the main function.`,
        };
    }

    purgeExpired();

    const alreadyQueued = yarnAndUserIds.some(
        (c) => c.userId === userId && c.yarnId === yarnId && c.lastInsertedId === lastInsertedId
    );
    if (!alreadyQueued) {
        yarnAndUserIds.push({ yarnId, lastInsertedId, userId, queuedAt: Date.now() });
    }

    // Only ever hand back this user's own entries
    return yarnAndUserIds.filter((c) => c.userId === userId);
};

export const prepareToGenerate = (req: Request, res: Response): void => {
    const userId = Number(req.params.userId);

    if (!userId) {
        res.status(404).send({ message: "Something went wrong", type: "err" });
        return;
    }

    // A user may only see their own queue
    const authUserId = Number(req.user?.userId);
    if (authUserId && authUserId !== userId) {
        res.status(403).send({ message: "Access Denied", type: "err" });
        return;
    }

    purgeExpired();
    const challansToSend = yarnAndUserIds.filter((challan) => challan.userId === userId);

    if (challansToSend.length === 0) {
        res.status(404).send({ message: "No user id found to send", type: "message" });
        return;
    }

    res.status(200).send(challansToSend);
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

// Treat empty / "0" placeholder values as "not set" so they don't print as "0" or "Lot 0"
const clean = (v: unknown): string => {
    const s = String(v ?? "").trim();
    return s && s !== "0" && s.toUpperCase() !== "NULL" ? s : "";
};

// Always format in Bangladesh time (Render runs in UTC)
const fmtDate = (d: Date | string | number | null | undefined) => {
    if (!d) return "   /   /";
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
        .format(new Date(d))
        .replace(/\//g, " / ");
};

const fmtTime = (d: Date | string | number | null | undefined) => {
    if (!d) return "";
    return new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(d));
};

// avoid floating point noise like 1112.0000000001
const fmtQty = (n: number) => String(Number(n.toFixed(2)));

interface DeliveryRow {
    id: number;
    challanNo: number;
    fromFactory: string;
    toFactory: string;
    deliveryDate: Date;
    createdAt: Date;
    deliveryQty: number;
}

interface StyleInfo {
    jobNo: string;
    buyerName: string;
    styleNo: string;
}

interface CompositionRow {
    id: number;
    composition: string;
    color: string;
    deliveries: DeliveryRow[];
    workOrder: {
        lotNo: string;
        machineDia: string;
        yarnCount: string;
        jobNo: string;
        styleNo: string;
        styleRequirement: StyleInfo | null;
    };
    styleRequirementRow: { styleRequirement: StyleInfo } | null;
}

interface Line {
    comp: CompositionRow;
    dl: DeliveryRow;
}

// The result is cast to our own row types so the file never depends on Prisma's
// generated payload types (adjust the interfaces above if your schema differs).
const fetchCompositions = async (
    compositionWhere: Record<string, unknown>,
    deliveryWhere: Record<string, unknown>
): Promise<CompositionRow[]> => {
    const rows = await prisma.composition.findMany({
        where: compositionWhere,
        select: {
            id: true,
            composition: true,
            color: true,
            deliveries: {
                where: deliveryWhere,
                orderBy: { id: "asc" },
                select: {
                    id: true,
                    challanNo: true,
                    fromFactory: true,
                    toFactory: true,
                    deliveryDate: true,
                    createdAt: true,
                    deliveryQty: true,
                },
            },
            workOrder: {
                select: {
                    lotNo: true,
                    machineDia: true,
                    yarnCount: true,
                    jobNo: true,
                    styleNo: true,
                    styleRequirement: {
                        select: { jobNo: true, buyerName: true, styleNo: true },
                    },
                },
            },
            styleRequirementRow: {
                select: {
                    styleRequirement: {
                        select: { jobNo: true, buyerName: true, styleNo: true },
                    },
                },
            },
        },
    } as any);
    return rows as unknown as CompositionRow[];
};

/* -------------------------------------------------------------------------- */
/*  Download                                                                  */
/*  Two modes:                                                                */
/*   1) GET /download?deliveryIds=1,2,3   -> stateless (recommended)          */
/*   2) GET /download                     -> uses this user's queued entries  */
/* -------------------------------------------------------------------------- */
export const downloadChallan = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.user?.userId);
        if (!userId) {
            res.status(401).json({ message: "Access Denied" });
            return;
        }

        const deliveryIds = String(req.query.deliveryIds ?? "")
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => Number.isInteger(n) && n > 0);

        const useQueue = deliveryIds.length === 0;

        purgeExpired();
        const queued = useQueue ? yarnAndUserIds.filter((c) => c.userId === userId) : [];

        if (useQueue && queued.length === 0) {
            res.status(404).json({ message: "No challans queued for download. Please generate the challan again." });
            return;
        }

        /* ---------- DATA FETCH (only this user's data) ---------- */
        const results = useQueue
            ? await Promise.all(
                  queued.map((q) =>
                      fetchCompositions(
                          { id: q.yarnId },
                          {
                              ...(q.lastInsertedId !== null ? { id: q.lastInsertedId } : {}),
                              createdBy: userId,
                          }
                      )
                  )
              )
            : [
                  await fetchCompositions(
                      { deliveries: { some: { id: { in: deliveryIds }, createdBy: userId } } },
                      { id: { in: deliveryIds }, createdBy: userId }
                  ),
              ];

        /* ---------- ONE LINE PER DELIVERY (dedupe, drop empty compositions) ---------- */
        const seen = new Set<number>();
        const lines: Line[] = [];
        for (const comp of results.flat()) {
            for (const dl of comp.deliveries) {
                if (seen.has(dl.id)) continue;
                seen.add(dl.id);
                lines.push({ comp, dl });
            }
        }

        // print in ascending challan order
        lines.sort(
            (a, b) =>
                String(a.dl.challanNo ?? "").localeCompare(String(b.dl.challanNo ?? ""), undefined, {
                    numeric: true,
                }) || a.dl.id - b.dl.id
        );

        /* ---------- JOB / BUYER / STYLE (with fallbacks) ----------
           1) composition -> styleRequirementRow -> styleRequirement   (new data)
           2) composition -> workOrder -> styleRequirement             (legacy data)
           3) StyleRequirement looked up by workOrder.jobNo            (jobNo is unique)
           4) workOrder.jobNo / workOrder.styleNo strings              (buyer stays empty) */
        const jobNosToLookup = Array.from(
            new Set(
                lines
                    .filter(
                        (l) =>
                            !l.comp.styleRequirementRow?.styleRequirement &&
                            !l.comp.workOrder?.styleRequirement
                    )
                    .map((l) => l.comp.workOrder?.jobNo)
                    .filter((j): j is string => Boolean(j && clean(j)))
            )
        );

        const styleByJobNo = new Map<string, StyleInfo>();
        if (jobNosToLookup.length > 0) {
            const found = await prisma.styleRequirement.findMany({
                where: { jobNo: { in: jobNosToLookup } },
                select: { jobNo: true, buyerName: true, styleNo: true },
            });
            found.forEach((sr: StyleInfo) => styleByJobNo.set(sr.jobNo, sr));
        }

        const resolveStyle = ({ comp }: Line) => {
            const wo = comp.workOrder;
            const sr =
                comp.styleRequirementRow?.styleRequirement ??
                wo?.styleRequirement ??
                (wo?.jobNo ? styleByJobNo.get(wo.jobNo) : undefined);
            return {
                jobNo: clean(sr?.jobNo) || clean(wo?.jobNo),
                buyerName: clean(sr?.buyerName),
                styleNo: clean(sr?.styleNo) || clean(wo?.styleNo),
            };
        };

        /* ---------- GROUP BY (challanNo + from + to + jobNo) ---------- */
        const groupMap = new Map<string, Line[]>();
        for (const line of lines) {
            const jobNo = resolveStyle(line).jobNo || "NA";
            const key = [line.dl.challanNo, line.dl.fromFactory, line.dl.toFactory, jobNo].join("__");
            const bucket = groupMap.get(key);
            if (bucket) bucket.push(line);
            else groupMap.set(key, [line]);
        }
        const groups = Array.from(groupMap.values());

        // nothing to print -> never send a blank PDF
        if (groups.length === 0) {
            res.status(404).json({ message: "No deliveries found to generate challan." });
            return;
        }

        /* ---------- BUILD TABLE ROWS PER GROUP ---------- */
        const buildRows = (items: Line[]) =>
            items.map(({ comp, dl }) => {
                const lot = clean(comp.workOrder?.lotNo);
                const dia = clean(comp.workOrder?.machineDia);
                return {
                    desc: [
                        clean(comp.workOrder?.yarnCount),
                        clean(comp.composition),
                        clean(comp.color),
                        lot ? `Lot ${lot}` : "",
                        dia ? `Dia ${dia}` : "",
                    ]
                        .filter(Boolean)
                        .join(" "),
                    unit: "CHT",
                    qty: Number(dl.deliveryQty) || 0,
                };
            });

        /* ---------- PDF SETUP ---------- */
        const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="challans-${userId}-${Date.now()}.pdf"`);

        // Clear the queued entries we used only after the response was fully sent
        if (useQueue) {
            const used = new Set(queued);
            res.on("finish", () => {
                for (let i = yarnAndUserIds.length - 1; i >= 0; i--) {
                    const entry = yarnAndUserIds[i];
                    if (entry && used.has(entry)) yarnAndUserIds.splice(i, 1);
                }
            });
        }

        doc.pipe(res);

        /* ---------- LAYOUT CONSTANTS ---------- */
        const L = 40;
        const R = 595.28 - 40;
        const W = R - L;

        const COL_W: number[] = [45, 265, 70, 85, 50];
        const colWidth = (i: number): number => COL_W[i] ?? 0;
        const TABLE_TOP = 195;
        const HEAD_H = 22;
        const ROW_H = 20;
        const MIN_ROWS = 21; // empty ruled rows to look like the paper form
        const MAX_ROWS = 24; // max rows that fit on one page

        const field = (label: string, value: string, x: number, y: number, w: number) => {
            doc.font("Helvetica").fontSize(9.5).fillColor("#000");
            const lw = doc.widthOfString(label);
            doc.text(label, x, y);
            doc.save();
            doc.strokeColor("#555").lineWidth(0.6).dash(1, { space: 2 });
            doc.moveTo(x + lw + 4, y + 7).lineTo(x + w, y + 7).stroke();
            doc.undash();
            doc.restore();
            doc.fillColor("#000").text(value || "", x + lw + 6, y, { width: w - lw - 8 });
        };

        let pageCount = 0;

        /* ---------- ONE PAGE PER GROUP ---------- */
        groups.forEach((group) => {
            const allRows = buildRows(group);
            const first = group[0];
            if (!first) return;
            const dl0 = first.dl;
            const style = resolveStyle(first);

            // Split rows into pages if a group has more rows than fit
            const chunks: (typeof allRows)[] = [];
            for (let i = 0; i < Math.max(allRows.length, 1); i += MAX_ROWS) {
                chunks.push(allRows.slice(i, i + MAX_ROWS));
            }

            const totalQty = allRows.reduce((s, r) => s + r.qty, 0);

            chunks.forEach((rows, chunkIdx) => {
                if (pageCount > 0) doc.addPage();
                pageCount++;

                const BODY_ROWS = Math.min(MAX_ROWS, Math.max(MIN_ROWS, rows.length));
                const TABLE_BOT = TABLE_TOP + HEAD_H + ROW_H * BODY_ROWS;

                /* ---------- HEADER ---------- */
                doc.fillColor("#000").roundedRect(L, 50, 36, 36, 3).fill();
                doc.fillColor("#fff").font("Helvetica-Bold").fontSize(13)
                    .text("SM", L, 61, { width: 36, align: "center" });

                doc.fillColor("#000").font("Helvetica-Bold").fontSize(19)
                    .text("SM SOURCING (YARN STORE)", L, 55, { width: W, align: "center" });
                doc.font("Helvetica").fontSize(8.5)
                    .text("Factory: A/17, A/18, BSCIC Industrial Estate, Konabari, Gazipur, Bangladesh.",
                        L, 78, { width: W, align: "center" });

                const TITLE = "DELIVERY CHALLAN";
                doc.font("Helvetica-Bold").fontSize(10);
                const tw = doc.widthOfString(TITLE);
                const pw = tw + 28, ph = 17;
                const px = L + (W - pw) / 2, py = 90;
                doc.strokeColor("#000").lineWidth(1).roundedRect(px, py, pw, ph, ph / 2).stroke();
                doc.text(TITLE, px, py + 4, { width: pw, align: "center" });

                /* ---------- INFO FIELDS ---------- */
                const leftX = L, rightX = L + 265, colW = 250;
                let fy = 122;
                field("Sl. No.", String(dl0.challanNo ?? "-"), leftX, fy, colW);
                field("Gate Pass No:", String(dl0.challanNo ?? "-"), rightX, fy, colW);
                fy += 16;
                field("Name", String(dl0.toFactory ?? "-"), leftX, fy, colW);
                field("Date :", fmtDate(dl0.deliveryDate), rightX, fy, colW);
                fy += 16;
                field("Address", String(dl0.fromFactory ?? ""), leftX, fy, colW);
                field("Order No", style.jobNo || "-", rightX, fy, colW);
                fy += 16;
                field("Buyer", style.buyerName || "-", leftX, fy, colW);
                field("Style No", style.styleNo || "-", rightX, fy, colW);

                /* ---------- TABLE GRID ---------- */
                doc.strokeColor("#000").lineWidth(0.7);
                doc.moveTo(L, TABLE_TOP).lineTo(R, TABLE_TOP).stroke();
                doc.moveTo(L, TABLE_TOP + HEAD_H).lineTo(R, TABLE_TOP + HEAD_H).stroke();
                for (let r = 1; r <= BODY_ROWS; r++) {
                    const yy = TABLE_TOP + HEAD_H + r * ROW_H;
                    doc.moveTo(L, yy).lineTo(R, yy).stroke();
                }
                let vx = L;
                doc.moveTo(vx, TABLE_TOP).lineTo(vx, TABLE_BOT).stroke();
                COL_W.forEach((cw) => {
                    vx += cw;
                    doc.moveTo(vx, TABLE_TOP).lineTo(vx, TABLE_BOT).stroke();
                });

                // Table header
                doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
                let hx = L;
                ["Sl. No.", "Description of Goods", "Unit", "Quantity", "Remarks"].forEach((h, i) => {
                    doc.text(h, hx + 3, TABLE_TOP + 7, { width: colWidth(i) - 6, align: "center" });
                    hx += colWidth(i);
                });

                // Table rows
                doc.font("Helvetica").fontSize(9);
                const slOffset = chunkIdx * MAX_ROWS;
                rows.forEach((row, i) => {
                    const ry = TABLE_TOP + HEAD_H + i * ROW_H;
                    let cx = L;
                    [String(slOffset + i + 1), row.desc, row.unit, `${fmtQty(row.qty)} lb`, ""].forEach((txt, ci) => {
                        // fixed height + ellipsis so long descriptions never overlap the next row
                        doc.text(txt, cx + 4, ry + 5, { width: colWidth(ci) - 8, height: ROW_H - 6, ellipsis: true });
                        cx += colWidth(ci);
                    });
                });

                // Totals under bottom border (grand total of the whole challan)
                const unitX = L + colWidth(0) + colWidth(1);
                const qtyX = unitX + colWidth(2);
                doc.font("Helvetica-Bold").fontSize(9.5);
                doc.text(`${allRows.length} CHT`, unitX + 4, TABLE_BOT + 4, { width: colWidth(2) - 8 });
                doc.text(`${fmtQty(totalQty)} lb`, qtyX + 4, TABLE_BOT + 4, { width: colWidth(3) - 8 });

                /* ---------- GATE OUT STAMP ---------- */
                const sx = L + 55, sy = TABLE_BOT - 165, sw = 150, sh = 78;
                doc.strokeColor("#8b7fd6").lineWidth(1.2).roundedRect(sx, sy, sw, sh, 5).stroke();
                doc.fillColor("#8b7fd6").font("Helvetica-Bold").fontSize(11)
                    .text("GATE OUT", sx, sy + 6, { width: sw, align: "center" });
                doc.fontSize(6.5).text("SM SOURCING (YARN STORE)", sx, sy + 20, { width: sw, align: "center" });
                doc.font("Helvetica").fontSize(8.5);
                doc.text(`Date: ${fmtDate(dl0.deliveryDate)}`, sx + 12, sy + 32);
                doc.text(`Time: ${fmtTime(dl0.createdAt)}`, sx + 12, sy + 45);

                /* ---------- FOOTER + SIGNATURES ---------- */
                doc.fillColor("#000").font("Helvetica").fontSize(8.5)
                    .text("Received the above goods in good condition as per order",
                        L, TABLE_BOT + 30, { width: W, align: "center" });

                const sigY = TABLE_BOT + 75;
                const qw = W / 4;
                ["Signature of the Recipient", "Prepared by", "Store Incharge", "Authorized Signature"]
                    .forEach((lb, i) => {
                        const cx = L + qw * i + qw / 2;
                        doc.strokeColor("#000").lineWidth(0.8)
                            .moveTo(cx - 50, sigY).lineTo(cx + 50, sigY).stroke();
                        doc.font("Helvetica").fontSize(7.5).fillColor("#000")
                            .text(lb, L + qw * i, sigY + 5, { width: qw, align: "center" });
                    });
            });
        });

        doc.end();
    } catch (error) {
        console.error("[downloadChallan]", error);
        if (res.headersSent) {
            res.end();
            return;
        }
        res.status(500).json({ message: "Error generating PDF" });
    }
};