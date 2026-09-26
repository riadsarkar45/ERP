import type { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface HourlyWorkOrderRow {
  userId: number;
  userName: string;
  orderType: string;
  hourBucket: Date;
  workOrderCount: bigint;
}

export const hourlyWorkOrder = async (req: Request, res: Response) => {
  try {
    const { date, granularity, userId, orderType } = req.query;
    // date: "YYYY-MM-DD" (defaults to today)
    // granularity: "hourly" | "daily" (defaults to "hourly")
    // userId: optional filter to a single user
    // orderType: optional filter (e.g., "knittingOrder", "aopOrder", "dyeingOrder")

    const targetDate = date ? new Date(date as string) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const userFilter = userId ? Number(userId) : null;
    const orderTypeFilter = orderType ? String(orderType) : null;

    // ---------- DAILY TOTALS PER USER & ORDER TYPE ----------
    if (granularity === "daily") {
      const rows = await prisma.workOrder.groupBy({
        by: ["createdBy", "orderType"],
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay },
          ...(userFilter ? { createdBy: userFilter } : {}),
          ...(orderTypeFilter ? { orderType: orderTypeFilter } : {}),
        },
        _count: { id: true },
      });

      // Fetch user details for the names
      const userIds = [...new Set(rows.map((r) => r.createdBy).filter(Boolean))];
      const users = userIds.length > 0 
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, userName: true },
          })
        : [];

      const data = rows.map((r) => {
        const u = users.find((u) => u.id === r.createdBy);
        return {
          userId: r.createdBy,
          userName: u?.name && u.name !== "NULL" ? u.name : u?.userName ?? "Unknown",
          orderType: r.orderType || "Unknown",
          date: startOfDay.toISOString().slice(0, 10),
          workOrderCount: r._count.id,
        };
      });

      return res.json({ 
        success: true, 
        granularity: "daily", 
        date: startOfDay.toISOString().slice(0, 10), 
        data 
      });
    }

    // ---------- HOURLY BREAKDOWN PER USER & ORDER TYPE ----------
    // NOTE: Ensure "WorkOrder" matches your actual database table name. 
    // If your Prisma schema uses @@map("work_order"), change "WorkOrder" to "work_order" below.
    const rows = await prisma.$queryRaw<HourlyWorkOrderRow[]>`
      SELECT
        w."createdBy" AS "userId",
        COALESCE(NULLIF(u."name", 'NULL'), u."userName", 'Unknown') AS "userName",
        w."orderType" AS "orderType",
        date_trunc('hour', w."createdAt") AS "hourBucket",
        COUNT(w.id) AS "workOrderCount"
      FROM "WorkOrder" w
      LEFT JOIN "user" u ON u.id = w."createdBy"
      WHERE w."createdAt" >= ${startOfDay}
        AND w."createdAt" < ${endOfDay}
        ${userFilter ? Prisma.sql`AND w."createdBy" = ${userFilter}` : Prisma.empty}
        ${orderTypeFilter ? Prisma.sql`AND w."orderType" = ${orderTypeFilter}` : Prisma.empty}
      GROUP BY w."createdBy", u."name", u."userName", w."orderType", date_trunc('hour', w."createdAt")
      ORDER BY "hourBucket" ASC, "userId" ASC, "orderType" ASC
    `;

    const data = rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      orderType: r.orderType,
      hour: r.hourBucket,
      workOrderCount: Number(r.workOrderCount),
    }));

    return res.json({
      success: true,
      granularity: "hourly",
      date: startOfDay.toISOString().slice(0, 10),
      data,
    });
  } catch (err) {
    console.error("hourlyWorkOrder error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate work order report" });
  }
};