import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import prisma from "../../database/prismaClient/prisma";

export const generateKnittingPdfWorkOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const convertWorkOrderIdToNumber = Number(id);

  if (Number.isNaN(convertWorkOrderIdToNumber)) {
    res.status(400).send({ message: "Invalid work order id", type: "error" });
    return;
  }

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: convertWorkOrderIdToNumber},
    select: {
      jobNo: true,
      workOrderNo: true,
      workOrderPlaceDate: true,
      factoryName: true,
      // factoryAddress: true,        // add to schema/select if you store this
      // attnName: true,              // "Attn: MR. MASHUQ"
      lotNo: true,
      yarnCount: true,
      machineDia: true,
      stichLength: true,
      month: true,
      orderType: true,
      // numOfBodyKnittingMcProg: true,
      // productionStartDate: true,
      // productionCloseDate: true,
      // remarks: true,
      styleRequirement: {
        select: {
          jobNo: true,
          buyerName: true,
          poNo: true,
          styleNo: true,
          rows: {
            select: {
              finishDia: true,
            },
          },
        },
      },
      compositions: {
        select: {
          composition: true, // fabrication text, e.g. "95% Cotton/5% Elasthan S/J 173 Gsm"
          workOrderQty: true, // actual yarn work order qty
          orderQty: true, // garment pcs
          color: true,
          unitePrice: true,
        },
      },
      // If yarn breakdown (Cotton / Lycra rows) lives on its own relation:
      // yarnLines: {
      //   select: { yarnReq: true, yarnBrand: true, yarnCount: true, yarnLotNumber: true },
      // },
    },
  });

  if (!workOrder) {
    res.status(404).send({ message: "No work order found to generate", type: "error" });
    return;
  }

  const style = workOrder.styleRequirement;
  const compositions = workOrder.compositions ?? [];
  const finishDia = style?.rows?.[0]?.finishDia ?? "";

  // orderQty = garment pcs, workOrderQty = actual yarn/work order qty — kept separate on purpose
  const grandTotalOrderQty = compositions.reduce((sum, c) => sum + (c.orderQty ?? 0), 0);
  const grandTotalYarnReq = compositions.reduce((sum, c) => sum + (c.workOrderQty ?? 0), 0);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${workOrder.jobNo ?? convertWorkOrderIdToNumber}Knitting-WorkOrder.pdf"`
  );

  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
  doc.pipe(res);

  const pageLeft = doc.page.margins.left;
  const pageRight = doc.page.width - doc.page.margins.right;
  const usableWidth = pageRight - pageLeft;

  // ---------- Header ----------
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("SM SOURCING", pageLeft, 30, { width: usableWidth, align: "center" });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Dhanmondi, Road#8, House-3/1", pageLeft, 50, { width: usableWidth, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(`Work Order No-(${workOrder.workOrderNo ?? 1})`, pageLeft, 30, {
      width: usableWidth,
      align: "right",
    });

  doc.moveTo(pageLeft, 70).lineTo(pageRight, 70).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("Knitting Work Order", pageLeft, 76, { width: usableWidth, align: "center" });
  doc.moveTo(pageLeft, 96).lineTo(pageRight, 96).stroke();

  // ---------- HOD box (top right) ----------
  doc.rect(pageRight - 160, 30, 160, 16).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(`HOD: ${(workOrder.month ?? "").toUpperCase()}`, pageRight - 155, 34);

  // ---------- Attn / To / Address block (left) + Date/Buyer (right) ----------
  let y = 106;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("Attn:", pageLeft, y, { continued: true }).font("Helvetica").text("  MR. MASHUQ   (TOP URGENT)");
  doc.font("Helvetica-Bold").text("To:", pageLeft, (y += 14), { continued: true }).font("Helvetica").text(`  SM Sourcing (${workOrder.factoryName ?? ""})`);
  doc.font("Helvetica-Bold").text("Address:", pageLeft, (y += 14), { continued: true }).font("Helvetica").text("  A/12, Konabari, BSCIC, Gazipur");

  doc
    .font("Helvetica-Bold")
    .text(`DATE: ${workOrder.workOrderPlaceDate ? new Date(workOrder.workOrderPlaceDate).toLocaleDateString("en-GB") : ""}`, pageLeft, 106, {
      width: usableWidth,
      align: "right",
    });
  doc.text(`BUYER: ${style?.buyerName ?? ""}`, pageLeft, 120, { width: usableWidth, align: "right" });

  // ---------- Job No / Num of Body boxes ----------
  y = 156;
  doc.rect(pageLeft, y, 220, 18).stroke();
  doc.font("Helvetica-Bold").fontSize(9).text(`JOB NUMBER : ${style?.jobNo ?? workOrder.jobNo ?? ""}`, pageLeft + 5, y + 5);

  doc.rect(pageRight - 150, y, 150, 18).stroke();
  doc.text("Num of Body Knitting M/C Prog", pageRight - 145, y - 12, { fontSize: 7 } as any);
  doc.fontSize(9).text("1", pageRight - 75, y + 5);

  y += 30;
  doc.font("Helvetica-Bold").fontSize(10).text("Subject: Knitting Work Order", pageLeft, y);
  y += 20;

  // ---------- Table ----------
  // Note: Yarn Brand and Yarn Lot No. were carrying the same value, so Yarn Brand is dropped.
  const columns = [
    { key: "style", label: "STYLE", width: 50 },
    { key: "po", label: "PO NO.", width: 40 },
    { key: "color", label: "Color", width: 40 },
    { key: "fab", label: "Fabrication", width: 90 },
    { key: "yarnReq", label: "Yarn req.", width: 45 },
    { key: "yarnCount", label: "Yarn Count", width: 55 },
    { key: "yarnLot", label: "Yarn Lot No.", width: 55 },
    { key: "sl", label: "SL", width: 30 },
    { key: "orderQty", label: "Order Qnty (Pcs)", width: 45 },
    { key: "hod", label: "HOD", width: 50 },
    { key: "price", label: "PRICE/BDT/kg", width: 45 },
    { key: "finWidth", label: "Fin. fab. Width", width: 45 },
    { key: "md", label: "M/D", width: 35 },
    { key: "prodStart", label: "Prod. start", width: 45 },
    { key: "prodClose", label: "Prod. close", width: 45 },
    { key: "remarks", label: "REMARKS", width: 45 },
  ];
  // sums to 760pt — fits inside the ~782pt usable width on landscape A4 with 30pt margins

  const rowHeight = 26;
  const headerHeight = 26;

  const drawRow = (rowY: number, height: number, cells: (string | number)[], bold = false) => {
    let x = pageLeft;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(7);
    columns.forEach((col, i) => {
      doc.rect(x, rowY, col.width, height).stroke();
      doc.text(String(cells[i] ?? ""), x + 2, rowY + 4, {
        width: col.width - 4,
        height: height - 4,
        align: "center",
      });
      x += col.width;
    });
  };

  // Header row
  drawRow(
    y,
    headerHeight,
    columns.map((c) => c.label),
    true
  );
  y += headerHeight;

  // Data rows — one row per composition.
  // orderQty = garment pcs (Order Qnty column). workOrderQty = actual yarn work order qty (Yarn req. column).
  compositions.forEach((c) => {
    drawRow(y, rowHeight, [
      style?.styleNo ?? "",
      style?.poNo ?? "",
      c.color ?? "",
      c.composition ?? "",
      c.workOrderQty ?? "", // Yarn req. — actual work order qty
      workOrder.yarnCount ?? "",
      workOrder.lotNo ?? "",
      workOrder.stichLength ?? "",
      c.orderQty ?? "", // Order Qnty (Pcs) — garment pcs
      workOrder.month ?? "",
      c.unitePrice ?? "",
      finishDia,
      workOrder.machineDia ?? "",
      "", // production start
      "", // production close
      "", // remarks
    ]);
    y += rowHeight;
  });

  // Grand total row — order qty (pcs) and yarn req totaled separately, matching the source sheet
  drawRow(
    y,
    20,
    [
      "Grand Total =",
      "",
      "",
      "",
      grandTotalYarnReq,
      "",
      "",
      "",
      grandTotalOrderQty,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ],
    true
  );
  y += 20;

  // ---------- Delivery place / notes ----------
  y += 14;
  doc.font("Helvetica-Bold").fontSize(9).text("Delivery place :", pageLeft, y, { continued: true }).font("Helvetica").text("   Factory.");
  y += 16;

  const remarks = [
    "01. Please follow gsm not Higher on our requirement.",
    "02. During process loss not be over 8%.",
    "03. Thanking you in advance for your nice co-operation.",
    "04. Only Satuf Not Allowed.",
    "05. Edge to edge dia should be 100% accurate as per our work order. Roll to roll dia discrepancy not allowed.",
    "06. Payment by Cash after deliver the order. Supplier will send bill order to order seperately.",
  ];
  doc.font("Helvetica-Bold").fontSize(8).text("Remarks.", pageLeft, y);
  y += 12;
  doc.font("Helvetica").fontSize(7.5);
  remarks.forEach((line) => {
    doc.text(line, pageLeft, y, { width: usableWidth - 200 });
    y += 11;
  });

  // NOTE box (right side, roughly aligned with remarks)
  doc
    .rect(pageRight - 190, y - remarks.length * 11 - 12, 190, 60)
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .text(
      "NOTE: After Knitting Grey Fabric will directly deliver to SM Sourcing Ltd. Grey Fabric Store for Inspection & on each Grey Fabric roll should be written by Yellow Marker.",
      pageRight - 185,
      y - remarks.length * 11 - 8,
      { width: 180 }
    );

  doc.font("Helvetica-Bold").fontSize(8).text("*** Any Kind of Lose Yarn Return & Process Loss Not Allow", pageLeft, y + 6);
  y += 30;

  // ---------- Signatures ----------
  const sigY = Math.max(y, doc.page.height - 90);
  const sigLabels = [
    { title: "Prepared by", name: "Mr. Junan" },
    { title: "Checked By", name: "Mr. Bulbul" },
    { title: "Checked By", name: "Mr. Ashraf" },
    { title: "Checked By", name: "Mr. Mashuk (Head of Fabric)" },
    { title: "Checked By", name: "Mr. Jewel" },
  ];
  const sigColWidth = usableWidth / sigLabels.length;
  sigLabels.forEach((sig, i) => {
    const sx = pageLeft + i * sigColWidth;
    doc.moveTo(sx + 10, sigY).lineTo(sx + sigColWidth - 10, sigY).stroke();
    doc.font("Helvetica-Bold").fontSize(8).text(sig.title, sx, sigY + 4, { width: sigColWidth, align: "center" });
    doc.font("Helvetica").fontSize(7.5).text(sig.name, sx, sigY + 15, { width: sigColWidth, align: "center" });
  });

  doc.end();
};