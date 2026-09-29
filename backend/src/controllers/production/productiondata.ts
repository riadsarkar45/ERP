import { Request, Response, Router } from "express"
import prisma from "../../database/prismaClient/prisma"

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000 // UTC+6

// Handled separately later, so left out of the summary
const EXCLUDED_TYPES = [
  "numberOfMC",
  "lineNumber",
  "targetHour",
  "productionTarget",
]

const getDhakaDayRange = (base: Date) => {
  const dhaka = new Date(base.getTime() + DHAKA_OFFSET_MS)
  const startUtcMs =
    Date.UTC(dhaka.getUTCFullYear(), dhaka.getUTCMonth(), dhaka.getUTCDate()) -
    DHAKA_OFFSET_MS

  return {
    startMs: startUtcMs,
    endMs: startUtcMs + 24 * 60 * 60 * 1000,
    label: dhaka.toISOString().slice(0, 10),
  }
}

type QtyMap = { [productionType: string]: number }

type ColorEntry = {
  colorId: string
  color: string | null
  composition: string | null
  orderQty: number
  rawOrderQty: unknown // temporary: shows what the database really returns
  today: QtyMap
  total: QtyMap
}

const addQty = (map: QtyMap, type: string, qty: number) => {
  map[type] = (map[type] ?? 0) + qty
}

// Handles numbers, "1200", "1,200", "1200 pcs" and Prisma Decimal values
const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  const cleaned = String(value).replace(/[^0-9.\-]/g, "")
  const n = Number(cleaned)
  return isNaN(n) ? 0 : n
}

const fetchProductionData = async (date: Date) => {
  const { startMs, endMs, label } = getDhakaDayRange(date)

  const styles = await prisma.styleRequirement.findMany({
    // take: 20,
    select: {
      jobNo: true,
      buyerName: true,
      hodDate: true,
      rows: {
        where: {orderQty: {
          gt: 0,
        }},
        select: {
          id: true, // this is the unique colorId
          color: true,
          composition: true,
          orderQty: true,
          productionDatas: {
            where: { productionType: { notIn: EXCLUDED_TYPES } },
            select: {
              productionDate: true,
              productionQty: true,
              productionType: true,
            },
          },
        },
      },
    },
  })

  const jobs = styles.map((style) => {
    const jobToday: QtyMap = {}
    const jobTotal: QtyMap = {}
    let jobOrderQty = 0

    // keyed by colorId, so same color names never collide
    const colors: { [colorId: string]: ColorEntry } = {}

    for (const row of style.rows) {
      const colorId = String(row.id)
      const orderQty = toNumber(row.orderQty)

      if (!colors[colorId]) {
        colors[colorId] = {
          colorId,
          color: row.color ?? null,
          composition: row.composition ?? null,
          orderQty,
          rawOrderQty: row.orderQty,
          today: {},
          total: {},
        }
        jobOrderQty += orderQty
      }

      for (const pd of row.productionDatas) {
        const type = String(pd.productionType)
        const qty = toNumber(pd.productionQty)
        const t = new Date(pd.productionDate).getTime()
        const isToday = t >= startMs && t < endMs

        // total = previous days + today
        addQty(colors[colorId].total, type, qty)
        addQty(jobTotal, type, qty)

        // today only
        if (isToday) {
          addQty(colors[colorId].today, type, qty)
          addQty(jobToday, type, qty)
        }
      }
    }

    return {
      jobNo: style.jobNo,
      buyerName: style.buyerName ?? null,
      hodDate: style.hodDate ?? null,
      orderQty: jobOrderQty, // sum of all color orderQty in this job
      today: jobToday,
      total: jobTotal,
      colors,
    }
  })

  return { date: label, jobs }
}

export const getProductionDataController = async (
  req: Request,
  res: Response
) => {
  try {
    const dateParam = req.query.date as string | undefined
    const date = dateParam ? new Date(dateParam) : new Date()

    if (isNaN(date.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date. Use YYYY-MM-DD." })
    }

    const data = await fetchProductionData(date)
    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error("getProductionData error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch production data" })
  }
}

