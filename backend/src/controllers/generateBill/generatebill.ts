import PDFDocument from "pdfkit";
import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";

export const generateBill = async (req: Request, res: Response) => {
    const { challanIds } = req.body as { challanIds: number[] };

    if (!challanIds || challanIds.length === 0) {
        return res.status(400).send({ msg: "No challan IDs provided", type: "error" });
    }

    const getChallans = await prisma.challan.findMany({
        where: { id: { in: challanIds } },
        select: {
            id: true,
            challanNo: true,
            challanDate: true,
            fromFactory: true,
            toFactory: true,
            deliveries: { select: { id: true, deliveryQty: true } },
            composition: {
                select: {
                    unitePrice: true,
                    workOrder: {
                        select: {
                            jobNo: true,
                        }
                    }
                }
            },
        }
    });

    if (getChallans.length === 0) {
        return res.status(404).send({ msg: "No matching challans found", type: "error" });
    }

    const rows = getChallans.map((c) => {
        const totalQty = c.deliveries.reduce((sum, d) => sum + d.deliveryQty, 0);
        const composition = Array.isArray(c.composition) ? c.composition[0] : c.composition;
        const unitPrice = composition?.unitePrice ?? 0;
        const jobNo = composition?.workOrder?.jobNo ?? "-";
        const lineTotal = totalQty * unitPrice;
        return {
            challanNo: c.challanNo,
            jobNo,
            date: c.challanDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
            from: c.fromFactory,
            to: c.toFactory,
            qty: totalQty,
            unitPrice,
            lineTotal,
        };
    });

    const grandTotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);
    const billNo = `SM-${Date.now()}`;
    const billDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=bill-${billNo}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width - 80;
    const startX = 40;

    // ---------- LETTERHEAD ----------
    doc.rect(0, 0, doc.page.width, 90).fill("#1a2b3c");
    doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold")
        .text("SM SOURCING", startX, 28, { width: pageWidth });
    doc.fontSize(9).font("Helvetica").fillColor("#cfd8e0")
        .text("Garment & Textile Sourcing  |  Dhaka, Bangladesh", startX, 56);
    doc.fillColor("#000000");
    doc.y = 110;

    // ---------- BILL META ----------
    doc.fontSize(16).font("Helvetica-Bold").fillColor("#1a2b3c")
        .text("BILLING STATEMENT", startX, doc.y, { width: pageWidth, align: "center" });
    doc.moveDown(0.8);

    const metaY = doc.y;
    doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#000")
        .text(`Bill No: `, startX, metaY, { continued: true })
        .font("Helvetica").text(billNo);
    doc.font("Helvetica-Bold")
        .text(`Date: `, startX + 300, metaY, { continued: true })
        .font("Helvetica").text(billDate);
    doc.moveDown(1.2);

    doc.moveTo(startX, doc.y).lineTo(startX + pageWidth, doc.y).stroke("#1a2b3c");
    doc.moveDown(1);

    // ---------- TABLE ----------
    let y = doc.y;
    const colWidths = { challan: 80, jobNo: 110, date: 90, from: 120, to: 140, qty: 60, rate: 65, total: 97 };
    const colX: Record<string, number> = {};
    let cursor = startX;
    for (const key of Object.keys(colWidths) as (keyof typeof colWidths)[]) {
        colX[key] = cursor;
        cursor += colWidths[key];
    }
    const tableWidth = Object.values(colWidths).reduce((a, b) => a + b, 0);

    const drawHeaderRow = (yPos: number) => {
        doc.rect(startX, yPos, tableWidth, 24).fill("#1a2b3c");
        doc.fillColor("#fff").fontSize(9).font("Helvetica-Bold");
        doc.text("Challan No", colX.challan as any + 5, yPos + 7, { width: colWidths.challan - 8 });
        doc.text("Job No", colX.jobNo as any + 5, yPos + 7, { width: colWidths.jobNo - 8 });
        doc.text("Date", colX.date as any + 5, yPos + 7, { width: colWidths.date - 8 });
        doc.text("From", colX.from as any + 5, yPos + 7, { width: colWidths.from - 8 });
        doc.text("To", colX.to as any + 5, yPos + 7, { width: colWidths.to - 8 });
        doc.text("Qty", colX.qty as any + 5, yPos + 7, { width: colWidths.qty - 8, align: "right" });
        doc.text("Rate", colX.rate as any + 5, yPos + 7, { width: colWidths.rate - 8, align: "right" });
        doc.text("Total", colX.total as any + 5, yPos + 7, { width: colWidths.total - 8, align: "right" });
        doc.fillColor("#000").font("Helvetica");
        return yPos + 24;
    };

    y = drawHeaderRow(y);

    rows.forEach((r, i) => {
        if (y > 480) {
            doc.addPage();
            y = 40;
            y = drawHeaderRow(y);
        }

        const rowHeight = 22;
        if (i % 2 === 0) {
            doc.rect(startX, y, tableWidth, rowHeight).fill("#f2f4f6");
            doc.fillColor("#000");
        }

        doc.fontSize(8.5);
        doc.text(String(r.challanNo), colX.challan as any + 5, y + 6, { width: colWidths.challan - 8 });
        doc.text(String(r.jobNo), colX.jobNo as any + 5, y + 6, { width: colWidths.jobNo - 8 });
        doc.text(r.date, colX.date as any + 5, y + 6, { width: colWidths.date - 8 });
        doc.text(r.from, colX.from as any + 5, y + 6, { width: colWidths.from - 8 });
        doc.text(r.to, colX.to as any + 5, y + 6, { width: colWidths.to - 8 });
        doc.text(String(r.qty), colX.qty as any + 5, y + 6, { width: colWidths.qty - 8, align: "right" });
        doc.text(r.unitPrice.toFixed(2), colX.rate as any + 5, y + 6, { width: colWidths.rate - 8, align: "right" });
        doc.text(r.lineTotal.toFixed(2), colX.total as any + 5, y + 6, { width: colWidths.total - 8, align: "right" });

        // vertical column separators
        doc.strokeColor("#e0e0e0").lineWidth(0.5);
        let sepX = startX;
        for (const w of Object.values(colWidths)) {
            sepX += w;
            doc.moveTo(sepX, y).lineTo(sepX, y + rowHeight).stroke();
        }

        y += rowHeight;
    });

    doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke("#1a2b3c");
    y += 14;

    // ---------- GRAND TOTAL ----------
    doc.rect(startX + tableWidth - 200, y, 200, 28).fill("#1a2b3c");
    doc.fillColor("#fff").fontSize(11).font("Helvetica-Bold")
        .text(`Grand Total: ${grandTotal.toFixed(2)}`, startX + tableWidth - 195, y + 8, { width: 190, align: "right" });
    doc.fillColor("#000");
    y += 50;

    // ---------- SIGNATURE BLOCK ----------
    if (y > 470) {
        doc.addPage();
        y = 60;
    }
    doc.fontSize(9).font("Helvetica");

    const sigWidth = tableWidth / 3;

    doc.moveTo(startX + 10, y + 40).lineTo(startX + sigWidth - 20, y + 40).stroke("#000");
    doc.text("Prepared By", startX + 10, y + 45, { width: sigWidth - 30, align: "center" });

    doc.moveTo(startX + sigWidth + 10, y + 40).lineTo(startX + sigWidth * 2 - 20, y + 40).stroke("#000");
    doc.text("Checked By", startX + sigWidth + 10, y + 45, { width: sigWidth - 30, align: "center" });

    doc.moveTo(startX + sigWidth * 2 + 10, y + 40).lineTo(startX + sigWidth * 3 - 20, y + 40).stroke("#000");
    doc.text("Authorized By", startX + sigWidth * 2 + 10, y + 45, { width: sigWidth - 30, align: "center" });

    // ---------- FOOTER ----------
    doc.fontSize(8).fillColor("#888")
        .text("This is a system-generated bill from SM Sourcing ERP.", startX, doc.page.height - 50, {
            width: pageWidth,
            align: "center",
        });

    doc.end();
}; 