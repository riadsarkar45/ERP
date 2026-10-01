import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const TOLERANCE = 0.99; // Closing threshold: 99% of required yarn quantity

type TypeTotal = {
  deliveryType: string;
  totalQty: number;
  challanCount: number;
  lastDeliveryDate: Date | null;
  lastChallanNo: number | null;
  lastChallanQty: number;
  rowsOver: number; // how many rows have this type over their required qty
};

// "Yarn Delivery" -> "YarnDelivery"
const cleanType = (t: string | null | undefined) =>
  (t ?? "").replace(/\s+/g, "") || "Unknown";

// Row processLoss (String, default "NULL") is used only when it is a valid number.
// Otherwise the StyleRequirement processLoss is used, then 0.
const resolveProcessLoss = (
  rowLoss: string | null | undefined,
  styleLoss: number | null | undefined
): number => {
  const v = rowLoss?.trim();
  if (v && v.toUpperCase() !== "NULL" && /^[0-9]+(\.[0-9]+)?$/.test(v)) {
    return parseFloat(v);
  }
  return styleLoss ?? 0;
};

export const deliveryClosing = async (req: Request, res: Response) => {
  try {
    const jobNoParam = req.params.jobNo;
    // ?details=true also returns every delivery line inside each row
    const withDetails = req.query.details === "true";

    if (!jobNoParam || typeof jobNoParam !== "string") {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Extract the actual job number (e.g., "JOB-1234" -> "1234")
    const jobEnding = jobNoParam.split("-").pop();

    if (!jobEnding) {
      return res.status(400).json({
        success: false,
        message: "Invalid job number",
      });
    }

    const requirements = await prisma.styleRequirement.findMany({
      where: {
        jobNo: { endsWith: `-${jobEnding}` },
      },
      take: 30,
      select: {
        jobNo: true,
        styleNo: true,
        processLoss: true, // fallback when the row has none
        rows: {
          select: {
            color: true,
            composition: true,
            processLoss: true, // first priority
            additional: true,
            finishRequiredQty: true,
            compositions: {
              select: {
                id: true, // yarnCompId
                deliveries: {
                  select: {
                    id: true,
                    deliveryType: true,
                    deliveryQty: true,
                    deliveryDate: true,
                    challanNo: true,
                  },
                  orderBy: { deliveryDate: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!requirements || requirements.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No style requirements found for this job number",
      });
    }

    const result = requirements.map((reqItem) => {
      // Job-wise totals by delivery type (all rows of this job combined)
      const typeMap = new Map<string, TypeTotal>();
      let jobTotalDelivered = 0;
      let jobYarnRequiredQty = 0;

      const rowsData = reqItem.rows.map((row) => {
        const resolvedProcessLoss = resolveProcessLoss(
          row.processLoss,
          reqItem.processLoss
        );

        const finishRequiredQty = row.finishRequiredQty ?? 0;
        const additional = row.additional ?? 0;

        // (finishRequiredQty + additional) * (1 + processLoss / 100)
        const yarnRequiredQty =
          (finishRequiredQty + additional) * (1 + resolvedProcessLoss / 100.0);

        let rowTotalDelivered = 0;
        const rowTypeQty = new Map<string, number>();
        const singleOverTypes = new Set<string>(); // types with one line above required
        const deliveryDetails: any[] = [];

        for (const comp of row.compositions) {
          for (const delivery of comp.deliveries) {
            const qty = delivery.deliveryQty ?? 0;
            const type = cleanType(delivery.deliveryType);
            const date = delivery.deliveryDate
              ? new Date(delivery.deliveryDate)
              : null;

            rowTotalDelivered += qty;
            rowTypeQty.set(type, (rowTypeQty.get(type) ?? 0) + qty);

            // one delivery line bigger than the whole requirement
            const singleOver = yarnRequiredQty > 0 && qty > yarnRequiredQty;
            if (singleOver) singleOverTypes.add(type);

            // add into the JOB's delivery type totals
            const t = typeMap.get(type) ?? {
              deliveryType: type,
              totalQty: 0,
              challanCount: 0,
              lastDeliveryDate: null,
              lastChallanNo: null,
              lastChallanQty: 0,
              rowsOver: 0,
            };
            t.totalQty += qty;
            t.challanCount += 1;
            if (!t.lastDeliveryDate || (date && date >= t.lastDeliveryDate)) {
              t.lastDeliveryDate = date;
              t.lastChallanNo = delivery.challanNo;
              t.lastChallanQty = qty;
            }
            typeMap.set(type, t);

            if (withDetails) {
              deliveryDetails.push({
                challanNo: delivery.challanNo,
                deliveryType: type,
                deliveryQty: delivery.deliveryQty,
                deliveryDate: delivery.deliveryDate,
                yarnCompId: comp.id,
                isOverRequired: singleOver,
              });
            }
          }
        }

        jobTotalDelivered += rowTotalDelivered;
        jobYarnRequiredQty += yarnRequiredQty;

        // Which delivery types are over the required qty for THIS row
        const overDeliveredTypes = Array.from(rowTypeQty.entries())
          .filter(
            ([type, q]) =>
              yarnRequiredQty > 0 &&
              (q > yarnRequiredQty || singleOverTypes.has(type))
          )
          .map(([type, q]) => ({
            deliveryType: type,
            totalQty: Number(q.toFixed(3)),
            requiredQty: Number(yarnRequiredQty.toFixed(3)),
            excessQty: Number(Math.max(0, q - yarnRequiredQty).toFixed(3)),
            hasSingleLineOver: singleOverTypes.has(type),
          }));

        // count this row against each over-delivered type at job level
        for (const o of overDeliveredTypes) {
          const t = typeMap.get(o.deliveryType);
          if (t) t.rowsOver += 1;
        }

        const totalOver =
          yarnRequiredQty > 0 && rowTotalDelivered > yarnRequiredQty;

        return {
          composition: row.composition,
          color: row.color,
          finishRequiredQty: Number(finishRequiredQty),
          additional: Number(additional),
          processLoss: Number(resolvedProcessLoss),
          yarnRequiredQty: Number(yarnRequiredQty.toFixed(3)),
          totalDelivered: Number(rowTotalDelivered.toFixed(3)),
          isClosed: rowTotalDelivered >= yarnRequiredQty * TOLERANCE,
          isOverDelivered: overDeliveredTypes.length > 0 || totalOver,
          isTotalOverDelivered: totalOver, // all types combined above required
          overDeliveredTypeNames: overDeliveredTypes.map((o) => o.deliveryType),
          overDeliveredTypes, // which types, with total / required / excess
          ...(withDetails ? { deliveries: deliveryDetails } : {}),
        };
      });

      const deliveryTypeSummary = Array.from(typeMap.values())
        .map((t) => {
          const totalQty = Number(t.totalQty.toFixed(3));
          const jobOver = jobYarnRequiredQty > 0 && totalQty > jobYarnRequiredQty;
          return {
            ...t,
            totalQty,
            // over at job level OR over inside at least one row
            isOverDelivered: jobOver || t.rowsOver > 0,
            excessQty: jobOver
              ? Number((totalQty - jobYarnRequiredQty).toFixed(3))
              : 0,
          };
        })
        .sort((a, b) => a.deliveryType.localeCompare(b.deliveryType));

      // Simple lookup: { "YarnDelivery": 1200.5, "GreyReceived": 800 }
      const deliveryTotals = Object.fromEntries(
        deliveryTypeSummary.map((t) => [t.deliveryType, t.totalQty])
      );

      // Job-level: which delivery types are over-delivered
      const overDeliveredTypes = deliveryTypeSummary
        .filter((t) => t.isOverDelivered)
        .map((t) => ({
          deliveryType: t.deliveryType,
          totalQty: t.totalQty,
          requiredQty: Number(jobYarnRequiredQty.toFixed(3)),
          excessQty: t.excessQty,
          rowsOver: t.rowsOver,
        }));

      return {
        jobNo: reqItem.jobNo,
        styleNo: reqItem.styleNo,
        yarnRequiredQty: Number(jobYarnRequiredQty.toFixed(3)),
        totalDelivered: Number(jobTotalDelivered.toFixed(3)),
        isClosed: jobTotalDelivered >= jobYarnRequiredQty * TOLERANCE,
        isOverDelivered:
          overDeliveredTypes.length > 0 || rowsData.some((r) => r.isOverDelivered),
        overDeliveredTypeNames: overDeliveredTypes.map((o) => o.deliveryType),
        overDeliveredTypes,
        deliveryTotals, // job-wise total per delivery type
        deliveryTypeSummary, // same, plus challan count, last challan and over flags
        rows: rowsData,
      };
    });

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("deliveryClosing error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch delivery closing data",
    });
  }
};