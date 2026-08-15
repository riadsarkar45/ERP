import type { Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface HourlyRow {
  userId: number;
  userName: string;
  hourBucket: Date;
  challanCount: bigint;
}

export const hourlyChallanReport = async (req: Request, res: Response) => {
  try {
    const { date, granularity, userId } = req.query;
    // date: "YYYY-MM-DD" (defaults to today)
    // granularity: "hourly" | "daily" (defaults to "hourly")
    // userId: optional filter to a single user

    const targetDate = date ? new Date(date as string) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const userFilter = userId ? Number(userId) : null;

    // ---------- DAILY TOTALS PER USER ----------
    if (granularity === "daily") {
      const rows = await prisma.deliveries.groupBy({
        by: ["createdBy"],
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay },
          ...(userFilter ? { createdBy: userFilter } : {}),
        },
        _count: { id: true },
      });

      const users = await prisma.user.findMany({
        where: { id: { in: rows.map((r) => r.createdBy) } },
        select: { id: true, name: true, userName: true },
      });

      const data = rows.map((r) => {
        const u = users.find((u) => u.id === r.createdBy);
        return {
          userId: r.createdBy,
          userName: u?.name && u.name !== "NULL" ? u.name : u?.name ?? "Unknown",
          date: startOfDay.toISOString().slice(0, 10),
          challanCount: r._count.id,
        };
      });

      return res.json({ success: true, granularity: "daily", date: startOfDay.toISOString().slice(0, 10), data });
    }

    // ---------- HOURLY BREAKDOWN PER USER ----------
    const rows = await prisma.$queryRaw<HourlyRow[]>`
      SELECT
        d."createdBy" AS "userId",
        COALESCE(NULLIF(u."name", 'NULL'), u."name") AS "userName",
        date_trunc('hour', d."createdAt") AS "hourBucket",
        COUNT(d.id) AS "challanCount"
      FROM deliveries d
      JOIN "user" u ON u.id = d."createdBy"
      WHERE d."createdAt" >= ${startOfDay}
        AND d."createdAt" < ${endOfDay}
        ${userFilter ? Prisma.sql`AND d."createdBy" = ${userFilter}` : Prisma.empty}
      GROUP BY d."createdBy", u."name", u."name", date_trunc('hour', d."createdAt")
      ORDER BY "hourBucket" ASC, "userId" ASC
    `;

    const data = rows.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      hour: r.hourBucket,
      challanCount: Number(r.challanCount),
    }));

    return res.json({
      success: true,
      granularity: "hourly",
      date: startOfDay.toISOString().slice(0, 10),
      data,
    });
  } catch (err) {
    console.error("hourlyChallanReport error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate report" });
  }
};