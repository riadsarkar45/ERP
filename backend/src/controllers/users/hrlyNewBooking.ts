import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";

interface HourlyBookingRow {
  userId: number | null;
  userName: string;
  hourBucket: Date;
  bookingCount: bigint;
}

export const hourlyBooking = async (req: Request, res: Response) => {
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
      const rows = await prisma.styleRequirement.groupBy({
        by: ["createdBy"],
        where: {
          createdAt: { gte: startOfDay, lt: endOfDay },
          ...(userFilter ? { createdBy: userFilter } : {}),
        },
        _count: { id: true },
      });

      // Fetch user details for the names (filter out nulls first)
      const userIds = [...new Set(rows.map((r) => r.createdBy).filter((id): id is number => id !== null))];
      const users = userIds.length > 0 
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, userName: true },
          })
        : [];

      const data = rows.map((r) => {
        const u = r.createdBy ? users.find((user) => user.id === r.createdBy) : null;
        return {
          userId: r.createdBy ?? 0,
          userName: u?.name && u.name !== "NULL" ? u.name : u?.userName ?? "Unknown / System",
          date: startOfDay.toISOString().slice(0, 10),
          bookingCount: r._count.id,
        };
      });

      return res.json({ 
        success: true, 
        granularity: "daily", 
        date: startOfDay.toISOString().slice(0, 10), 
        data 
      });
    }

    // ---------- HOURLY BREAKDOWN PER USER ----------
    // NOTE: Ensure "StyleRequirement" matches your actual database table name. 
    // If your Prisma schema uses @@map("style_requirement"), change "StyleRequirement" to "style_requirement" below.
    const rows = await prisma.$queryRaw<HourlyBookingRow[]>`
      SELECT
        sr."createdBy" AS "userId",
        COALESCE(NULLIF(u."name", 'NULL'), u."userName", 'Unknown / System') AS "userName",
        date_trunc('hour', sr."createdAt") AS "hourBucket",
        COUNT(sr.id) AS "bookingCount"
      FROM "StyleRequirement" sr
      LEFT JOIN "user" u ON u.id = sr."createdBy"
      WHERE sr."createdAt" >= ${startOfDay}
        AND sr."createdAt" < ${endOfDay}
        ${userFilter ? Prisma.sql`AND sr."createdBy" = ${userFilter}` : Prisma.empty}
      GROUP BY sr."createdBy", u."name", u."userName", date_trunc('hour', sr."createdAt")
      ORDER BY "hourBucket" ASC, "userId" ASC
    `;

    const data = rows.map((r) => ({
      userId: r.userId ?? 0,
      userName: r.userName,
      hour: r.hourBucket,
      bookingCount: Number(r.bookingCount),
    }));

    return res.json({
      success: true,
      granularity: "hourly",
      date: startOfDay.toISOString().slice(0, 10),
      data,
    });
  } catch (err) {
    console.error("hourlyBooking error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate booking report" });
  }
};