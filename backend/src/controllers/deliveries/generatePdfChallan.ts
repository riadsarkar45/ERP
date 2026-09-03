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
}

const yarnAndUserIds: ChallanData[] = [];

export const generatePdfChallan = (yarnId: number, lastInsertedId: number | null, userId: number): ChallanData[] | GeneratePdfChallanFailureResponse => {
    if (!yarnId) {
        return {
            success: false,
            message: `Challan id hasn't reached to the main function.`,
        };
    }

    yarnAndUserIds.push({ yarnId: yarnId, lastInsertedId: lastInsertedId, userId });

    return yarnAndUserIds;
};

export const prepareToGenerate = (req: Request, res: Response) => {
    const userId = Number(req.params.userId);

    if (!userId) {
        return res.status(404).send({ message: "Something went wrong", type: "err" });
    }

    const challansToSend = yarnAndUserIds.filter((challan) => challan.userId === userId);

    if (challansToSend.length === 0) {
        return res.status(404).send({ message: "No user id found to send", type: "message" });
    }

    console.log(challansToSend, "challans to send");

    return res.status(200).send(challansToSend);
};

export const downloadChallan = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.status(401).json({ message: "Access Denied" });

        /* ---------- DATA FETCH ---------- */
        const findYarnsForChallan = await Promise.all(
            yarnAndUserIds.map(async (challan) => {
                const { yarnId } = challan;
                return await prisma.composition.findMany({
                    where: { id: { in: [yarnId] } },
                    select: {
                        id: true,
                        composition: true,
                        color: true,
                        orderType: true,
                        deliveries: {
                            where: {
                                ...(challan.lastInsertedId !== null
                                    ? { id: { in: [challan.lastInsertedId] } }
                                    : {}),
                                createdBy: Number(userId),
                            },
                            select: {
                                id: true,
                                challanNo: true,
                                fromFactory: true,
                                toFactory: true,
                                deliveryDate: true,
                                deliveryQty: true,
                            },
                        },
                        workOrder: {
                            select: {
                                id: true,
                                lotNo: true,
                                machineDia: true,
                                yarnCount: true,
                                factoryName: true,
                            },
                        },
                        styleRequirementRow: {
                            select: {
                                styleRequirement: {
                                    select: { id: true, jobNo: true, buyerName: true, styleNo: true },
                                },
                            },
                        },
                    },
                });
            })
        );

        const flattenArray = findYarnsForChallan.flat();

        /* ---------- GROUP BY (challanNo + jobNo) ---------- */
        const groupMap = new Map<string, typeof flattenArray>();
        const groups: { key: string; items: typeof flattenArray }[] = [];

        flattenArray.forEach((item) => {
            const challanNo = item.deliveries[0]?.challanNo ?? "NA";
            const jobNo = item.styleRequirementRow?.styleRequirement?.jobNo ?? "NA";
            const key = `${challanNo}__${jobNo}`;

            if (!groupMap.has(key)) {
                groupMap.set(key, []);
                groups.push({ key, items: groupMap.get(key)! });
            }
            groupMap.get(key)!.push(item);
        });

        /* ---------- BUILD TABLE ROWS PER GROUP ---------- */
        const buildRows = (items: typeof flattenArray) => {
            const rows: { desc: string; unit: string; qty: number }[] = [];
            items.forEach((it) => {
                it.deliveries.forEach((dl) => {
                    rows.push({
                        desc: [
                            it.workOrder?.yarnCount,
                            it.composition,
                            it.color,
                            it.workOrder?.lotNo ? `Lot ${it.workOrder.lotNo}` : "",
                            it.workOrder?.machineDia ? `Dia ${it.workOrder.machineDia}` : "",
                        ].filter(Boolean).join(" "),
                        unit: "CHT",
                        qty: Number(dl.deliveryQty) || 0,
                    });
                });
            });
            return rows;
        };

        /* ---------- PDF SETUP ---------- */
        const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="challans-${userId}-${Date.now()}.pdf"`);
        doc.pipe(res);

        /* ---------- LAYOUT CONSTANTS ---------- */
        const L = 40;
        const R = 595.28 - 40;
        const W = R - L;

        const COL_W = [45, 265, 70, 85, 50] as any;
        const TABLE_TOP = 195;
        const HEAD_H = 22;
        const ROW_H = 20;
        const MIN_ROWS = 21;   // empty ruled rows to look like the paper form
        const MAX_ROWS = 24;   // max rows that fit on one page

        const fmtDate = (d: any) => {
            if (!d) return "   /   /";
            const dt = new Date(d);
            return `${String(dt.getDate()).padStart(2, "0")} / ${String(dt.getMonth() + 1).padStart(2, "0")} / ${dt.getFullYear()}`;
        };

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
            const allRows = buildRows(group.items);
            const firstItem = group.items[0];
            const dl0 = firstItem?.deliveries[0];
            const style = firstItem?.styleRequirementRow?.styleRequirement;

            // Split rows into pages if a group has more rows than fit
            const chunks: typeof allRows[] = [];
            for (let i = 0; i < Math.max(allRows.length, 1); i += MAX_ROWS) {
                chunks.push(allRows.slice(i, i + MAX_ROWS));
            }
            if (chunks.length === 0) chunks.push([]);

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
                field("Sl. No.", String(dl0?.challanNo ?? "-"), leftX, fy, colW);
                field("Gate Pass No:", String(dl0?.challanNo ?? "-"), rightX, fy, colW);
                fy += 16;
                field("Name", dl0?.toFactory ?? "-", leftX, fy, colW);
                field("Date :", fmtDate(dl0?.deliveryDate), rightX, fy, colW);
                fy += 16;
                field("Address", dl0?.fromFactory ?? "", leftX, fy, colW);
                field("Order No", style?.jobNo ?? "-", rightX, fy, colW);
                fy += 16;
                field("Buyer", style?.buyerName ?? "-", leftX, fy, colW);
                field("Style No", style?.styleNo ?? "-", rightX, fy, colW);

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
                COL_W.forEach((cw: number) => {
                    vx += cw;
                    doc.moveTo(vx, TABLE_TOP).lineTo(vx, TABLE_BOT).stroke();
                });

                // Table header
                doc.font("Helvetica-Bold").fontSize(9).fillColor("#000");
                let hx = L;
                ["Sl. No.", "Description of Goods", "Unit", "Quantity", "Remarks"].forEach((h, i) => {
                    doc.text(h, hx + 3, TABLE_TOP + 7, { width: COL_W[i] - 6, align: "center" });
                    hx += COL_W[i];
                });

                // Table rows (all compositions of this group)
                doc.font("Helvetica").fontSize(9);
                const slOffset = chunkIdx * MAX_ROWS;
                rows.forEach((row, i) => {
                    const ry = TABLE_TOP + HEAD_H + i * ROW_H;
                    let cx = L;
                    [String(slOffset + i + 1), row.desc, row.unit, `${row.qty} lb`, ""].forEach((txt, ci) => {
                        doc.text(txt, cx + 4, ry + 5, { width: COL_W[ci] - 8 });
                        cx += COL_W[ci];
                    });
                });

                // Totals under bottom border (grand total of the whole challan)
                const totalQty = allRows.reduce((s, r) => s + r.qty, 0);
                const unitX = L + COL_W[0] + COL_W[1];
                const qtyX = unitX + COL_W[2];
                doc.font("Helvetica-Bold").fontSize(9.5);
                doc.text(`${allRows.length} CHT`, unitX + 4, TABLE_BOT + 4, { width: COL_W[2] - 8 });
                doc.text(`${totalQty} lb`, qtyX + 4, TABLE_BOT + 4, { width: COL_W[3] - 8 });

                /* ---------- GATE OUT STAMP ---------- */
                const sx = L + 55, sy = TABLE_BOT - 165, sw = 150, sh = 78;
                doc.strokeColor("#8b7fd6").lineWidth(1.2).roundedRect(sx, sy, sw, sh, 5).stroke();
                doc.fillColor("#8b7fd6").font("Helvetica-Bold").fontSize(11)
                   .text("GATE OUT", sx, sy + 6, { width: sw, align: "center" });
                doc.fontSize(6.5).text("SM SOURCING (YARN STORE)", sx, sy + 20, { width: sw, align: "center" });
                doc.font("Helvetica").fontSize(8.5);
                doc.text(`Date: ${fmtDate(dl0?.deliveryDate)}`, sx + 12, sy + 32);
                doc.text(`Time: ${dl0?.deliveryDate ? new Date(dl0.deliveryDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}`, sx + 12, sy + 45);

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
        console.log(error);
        res.status(500).json({ message: "Error generating PDF", error });
    }
};