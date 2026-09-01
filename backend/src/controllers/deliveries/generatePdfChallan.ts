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
    challanId: number;
    userId: number;
}

const challanIds: ChallanData[] = [];

export const generatePdfChallan = (
    challanId: number,
    userId: number
): ChallanData[] | GeneratePdfChallanFailureResponse => {
    if (!challanId) {
        return {
            success: false,
            message: `Challan id hasn't reached to the main function.`,
        };
    }

    challanIds.push({ challanId, userId });

    return challanIds;
};

export const prepareToGenerate = (req: Request, res: Response) => {
    const userId = Number(req.params.userId);

    if (!userId) {
        return res.status(404).send({ message: "Something went wrong", type: "err" });
    }

    const challansToSend = challanIds.filter((challan) => challan.userId === userId);

    if (challansToSend.length === 0) {
        return res.status(404).send({ message: "No user id found to send", type: "message" });
    }

    return res.status(200).send(challansToSend);
};

/* ------------------------------------------------------------------ */
/*  Design constants — pulled straight off the paper challan           */
/* ------------------------------------------------------------------ */

const PAGE = { size: "A4" as const, margin: 40 };

const COLORS = {
    black: "#111111",
    grey: "#555555",
    line: "#000000",
};

const COMPANY = {
    name: "SM SOURCING (YARN STORE)",
    address: "Factory: A/17, A/18, BSCIC Industrial Estate, Konabari, Gazipur, Bangladesh.",
};

// Table columns as % of usable width — Sl No | Description | Unit | Quantity | Remarks
const COL_WEIGHTS = [0.07, 0.46, 0.14, 0.17, 0.16];
const TABLE_ROWS = 14; // empty ruled rows like the paper form; description fills into row 0

/* ------------------------------------------------------------------ */
/*  One challan's worth of data, shaped for rendering                  */
/* ------------------------------------------------------------------ */

interface ChallanRow {
    unit: string;
    quantity: string;
    remarks?: string;
}

interface ChallanPrintable {
    slNo: string | number;
    gatePassNo?: string;
    date: Date;
    orderNo?: string;
    styleNo?: string;
    recipientName: string; // "Name" field — who the goods go to
    recipientAddress?: string; // "Address" field
    buyer?: string;
    descriptionLines: string[]; // e.g. "Yarn delivery for knitting", "84 3/2 Ply Pthm #77824"
    rows: ChallanRow[];
}

/* ------------------------------------------------------------------ */
/*  Renderer — draws exactly one challan onto the current page         */
/* ------------------------------------------------------------------ */

// InstanceType<typeof PDFDocument> instead of the ambient PDFKit.PDFDocument
// namespace type — avoids "Cannot find namespace 'PDFKit'" if @types/pdfkit
// isn't picked up as an ambient global in this project's tsconfig.
function drawChallan(doc: InstanceType<typeof PDFDocument>, data: ChallanPrintable): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const usableWidth = right - left;
    let y = doc.page.margins.top;

    /* ---- Header: logo box + company name ---- */
    const logoSize = 34;
    doc.rect(left, y, logoSize, logoSize).lineWidth(1).stroke(COLORS.line);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(COLORS.black);
    doc.text("SM", left, y + 11, { width: logoSize, align: "center" });

    doc.fontSize(20).font("Helvetica-Bold");
    doc.text(COMPANY.name, left + logoSize + 10, y, { width: usableWidth - logoSize - 10 });

    doc.fontSize(8.5).font("Helvetica").fillColor(COLORS.grey);
    doc.text(COMPANY.address, left + logoSize + 10, y + 24, {
        width: usableWidth - logoSize - 10,
    });

    y += 46;
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1).stroke(COLORS.line);
    y += 10;

    /* ---- Sl No (left) + DELIVERY CHALLAN badge (right) ---- */
    doc.fillColor(COLORS.black).font("Helvetica").fontSize(10);
    doc.text(`Sl. No.  ${data.slNo}`, left, y);

    const badgeText = "DELIVERY CHALLAN";
    doc.font("Helvetica-Bold").fontSize(11);
    const badgeWidth = doc.widthOfString(badgeText) + 24;
    const badgeX = right - badgeWidth;
    doc.roundedRect(badgeX, y - 4, badgeWidth, 20, 10).stroke(COLORS.line);
    doc.text(badgeText, badgeX, y, { width: badgeWidth, align: "center" });

    y += 26;

    /* ---- Two-column meta block ---- */
    const metaLeftX = left;
    const metaRightX = left + usableWidth * 0.58;
    const metaColWidth = usableWidth * 0.55;
    const rightColWidth = usableWidth - (metaRightX - left);
    const lineHeight = 17;

    doc.font("Helvetica").fontSize(10);

    doc.text(`Name ......... ${data.recipientName}`, metaLeftX, y, { width: metaColWidth });
    doc.text(`Gate Pass No. : ${data.gatePassNo ?? ""}`, metaRightX, y, { width: rightColWidth });
    y += lineHeight;

    doc.text(`Address ...... ${data.recipientAddress ?? ""}`, metaLeftX, y, { width: metaColWidth });
    doc.text(`Date : ${formatDate(data.date)}`, metaRightX, y, { width: rightColWidth });
    y += lineHeight;

    doc.text(`Buyer ......... ${data.buyer ?? ""}`, metaLeftX, y, { width: metaColWidth });
    doc.text(`Order No. : ${data.orderNo ?? ""}`, metaRightX, y, { width: rightColWidth });
    y += lineHeight;

    doc.text("", metaLeftX, y, { width: metaColWidth });
    doc.text(`Style No. : ${data.styleNo ?? ""}`, metaRightX, y, { width: rightColWidth });
    y += lineHeight + 6;

    /* ---- Table ---- */
    const colWidths = COL_WEIGHTS.map((w) => w * usableWidth);
    const colX: number[] = [left];
    for (let i = 0; i < colWidths.length; i++) colX.push(colX[i]! + colWidths[i]!);

    const headerRowH = 22;
    const bodyRowH = 22;
    const tableTop = y;

    // Outer + header
    doc.lineWidth(1);
    doc.rect(left, tableTop, usableWidth, headerRowH).stroke(COLORS.line);
    const headers = ["Sl No.", "Description of Goods", "Unit", "Quantity", "Remarks"];
    headers.forEach((h: string, i: number) => {
        doc.font("Helvetica-Bold").fontSize(9.5);
        doc.text(h, colX[i]! + 4, tableTop + 6, {
            width: colWidths[i]! - 8,
            align: i === 1 ? "left" : "center",
        });
    });

    colX.forEach((x: number) => {
        doc.moveTo(x, tableTop).lineTo(x, tableTop + headerRowH).stroke(COLORS.line);
    });

    // Body rows
    let rowY = tableTop + headerRowH;
    doc.font("Helvetica").fontSize(9.5);

    for (let r = 0; r < TABLE_ROWS; r++) {
        doc.rect(left, rowY, usableWidth, bodyRowH).stroke(COLORS.line);
        colX.forEach((x: number) => {
            doc.moveTo(x, rowY).lineTo(x, rowY + bodyRowH).stroke(COLORS.line);
        });

        if (r === 0) {
            const descText = data.descriptionLines.join("\n");
            doc.text(descText, colX[1]! + 4, rowY + 5, { width: colWidths[1]! - 8 });
        }

        const row = data.rows[r];
        if (row) {
            doc.text(row.unit, colX[2]! + 2, rowY + 6, { width: colWidths[2]! - 4, align: "center" });
            doc.text(row.quantity, colX[3]! + 2, rowY + 6, { width: colWidths[3]! - 4, align: "center" });
            if (row.remarks) {
                doc.text(row.remarks, colX[4]! + 2, rowY + 6, { width: colWidths[4]! - 4, align: "center" });
            }
        }

        rowY += bodyRowH;
    }

    // Totals row
    doc.rect(left, rowY, usableWidth, bodyRowH).stroke(COLORS.line);
    colX.forEach((x: number) => {
        doc.moveTo(x, rowY).lineTo(x, rowY + bodyRowH).stroke(COLORS.line);
    });
    doc.font("Helvetica-Bold");
    const sumUnit = sumNumericPrefixed(data.rows.map((r) => r.unit));
    const sumQty = sumNumericPrefixed(data.rows.map((r) => r.quantity));
    doc.text(sumUnit ? `= ${sumUnit}` : "", colX[2]! + 2, rowY + 6, { width: colWidths[2]! - 4, align: "center" });
    doc.text(sumQty ? `= ${sumQty}` : "", colX[3]! + 2, rowY + 6, { width: colWidths[3]! - 4, align: "center" });
    rowY += bodyRowH;

    doc.font("Helvetica").fontSize(10);
    doc.text("Received the above goods in good condition as per order", left, rowY + 12, {
        width: usableWidth,
        align: "center",
    });

    /* ---- Signature row ---- */
    const sigY = rowY + 55;
    const sigLabels = ["Signature of the Recipient", "Prepared by", "Store Incharge", "Authorised Signature"];
    const sigColWidth = usableWidth / sigLabels.length;

    sigLabels.forEach((label: string, i: number) => {
        const x = left + i * sigColWidth;
        doc.moveTo(x + 10, sigY).lineTo(x + sigColWidth - 10, sigY).stroke(COLORS.line);
        doc.fontSize(8.5).fillColor(COLORS.grey);
        doc.text(label, x, sigY + 4, { width: sigColWidth, align: "center" });
    });

    doc.fillColor(COLORS.black);
}

function formatDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd} / ${mm} / ${yy}`;
}

// Sums leading numeric quantities like "29Kg" / "01bag". Kept simple since
// remarks/units vary per delivery type — returns "" if nothing parseable.
function sumNumericPrefixed(values: string[]): string {
    const nums: number[] = values
        .map((v) => v?.match(/^[\d.]+/)?.[0])
        .filter((v): v is string => !!v)
        .map(Number);
    if (nums.length === 0) return "";
    const total = nums.reduce((a, b) => a + b, 0);
    const unitSuffix = values.find((v) => v && /[a-zA-Z]/.test(v))?.replace(/^[\d.]+/, "") ?? "";
    return `${total}${unitSuffix}`;
}

/* ------------------------------------------------------------------ */
/*  Route handler — one challan per page, streamed straight to res     */
/* ------------------------------------------------------------------ */

export const downloadPDFchallan = async (req: Request, res: Response): Promise<void> => {
    const userId = Number(req.params.userId);
    const challansToSend = challanIds.filter((challan) => challan.userId === userId);

    if (challansToSend.length === 0) {
        res.status(404).send({ message: "No challans queued for this user" });
        return;
    }

    const deliveries = await prisma.deliveries.findMany({
        where: {
            createdBy: userId,
            id: { in: challansToSend.map(({ challanId }) => challanId) },
        },
        select: {
            id: true,
            createdAt: true,
            challanNo: true,
            deliveryQty: true,
            fromFactory: true,
            toFactory: true,
            composition: {
                select: {
                    color: true,
                    composition: true,
                    workOrder: {
                        select: {
                            jobNo: true,
                            styleRequirement: {
                                select: {
                                    buyerName: true,
                                    styleNo: true,
                                },
                            },
                        },
                    },
                },
            },
            userId: {
                select: { name: true, id: true },
            },
        },
    });

    if (!deliveries || deliveries.length === 0) {
        res.status(404).send({ message: "No delivery data found" });
        return;
    }

 

    const doc = new PDFDocument(PAGE);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="challans-${userId}-${Date.now()}.pdf"`);
    doc.pipe(res);

    deliveries.forEach((delivery, index: number) => {
        if (index > 0) doc.addPage(PAGE);

        // Prisma can return `composition` as either a single object or an array depending on schema.
        // Normalize it to an array so the PDF renderer can handle both shapes safely.
        const compositions = Array.isArray(delivery.composition)
            ? delivery.composition
            : delivery.composition
              ? [delivery.composition]
              : [];

        const workOrder = compositions[0]?.workOrder;
        const styleReq = workOrder?.styleRequirement;

        const printable: ChallanPrintable = {
            slNo: delivery.challanNo ?? delivery.id,
            date: delivery.createdAt,
            orderNo: workOrder?.jobNo ?? "",
            styleNo: styleReq?.styleNo ?? "",
            recipientName: delivery.toFactory ?? "",
            recipientAddress: delivery.fromFactory ?? "",
            buyer: styleReq?.buyerName ?? "",
            descriptionLines: [
                "Yarn delivery for knitting",
                compositions
                    .map((c) => `${c.composition ?? ""} ${c.color ?? ""}`.trim())
                    .filter(Boolean)
                    .join(", "),
            ].filter(Boolean),
            rows: [
                {
                    unit: "1 bag",
                    // Prisma Decimal fields (deliveryQty) aren't plain numbers —
                    // convert explicitly rather than relying on implicit coercion.
                    quantity: delivery.deliveryQty != null ? delivery.deliveryQty.toString() : "",
                },
            ],
        };

        drawChallan(doc, printable);
    });

    doc.end();
    return;
};