import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";
import { successResponse, errorResponse } from "../../utils/responseHandler";

export async function getOrderSummaryByStyle(req: Request, res: Response) {
  try {
    const result = await prisma.$queryRaw`
      SELECT
        s."styleName"  AS "style",
        s."id"         AS "styleId",

        STRING_AGG(DISTINCT j."buyer",       ', ') AS "buyers",
        STRING_AGG(DISTINCT f."factoryName", ', ') AS "factories",

        STRING_AGG(COALESCE(wo."orderQty", '0'), '+')             AS "totalOrderQty",
        STRING_AGG(COALESCE(wo."yarnDyedWorkOrderQty", '0'), '+') AS "totalYarnDyed",
        STRING_AGG(COALESCE(wo."yarnDeliveryForYD", '0'), '+')    AS "totalDelivery",
        STRING_AGG(COALESCE(wo."yarnReturnReceived", '0'), '+')   AS "totalReturn",
        STRING_AGG(COALESCE(wo."greyReceivedFromYD", '0'), '+')   AS "totalGreyReceived",
        STRING_AGG(COALESCE(wo."finishYarnReceived", '0'), '+')   AS "totalFinishYarn",
        STRING_AGG(COALESCE(wo."totalBillingAmount", '0'), '+')   AS "totalBillingAmount",
        STRING_AGG(COALESCE(wo."payableAmount", '0'), '+')        AS "totalPayableAmount",
        STRING_AGG(COALESCE(wo."paidBillingAmount", '0'), '+')    AS "totalPaidBillingAmount",
        STRING_AGG(COALESCE(wo."pendingBillingAmount", '0'), '+') AS "totalPendingBillingAmount"

      FROM "WorkOrder" wo
      INNER JOIN "Job"     j ON j."jobNo" = wo."jobNo"
      INNER JOIN "styles"  s ON s."id"    = j."stylesId"
      INNER JOIN "Factory" f ON f."id"    = j."factoryId"

      GROUP BY s."id", s."styleName"
      ORDER BY s."styleName" ASC;
    `;

    res.status(200).json(successResponse(result, "Style-wise order summary fetched"));
  } catch (error) {
    console.error("GetOrderSummaryByStyle error:", error);
    res.status(500).json(errorResponse("Failed to fetch order summary"));
  }
}