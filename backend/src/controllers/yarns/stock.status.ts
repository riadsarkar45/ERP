
import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const MOVEMENT_TYPES = {
    IN: "Received From Spinning",
    OUT: "Return To Spinning",
} as const;

const DELIVERY_TYPES = {
    IN: "Yarn Delivery",
    OUT: "Yarn Return",
} as const;

export const stockStatus = async (req: Request, res: Response) => {
    try {
        const [
            assignedStock,
            spinningMovement,
            yarnMovement,
        ] = await Promise.all([
            prisma.composition.aggregate({
                where: {
                    status: "ASSIGNED",
                },
                _sum: {
                    workOrderQty: true,
                },
                _count: {
                    id: true,
                },
            }),

            prisma.spinningYarnMovement.groupBy({
                by: ["movementType"],
                where: {
                    movementType: {
                        in: [
                            MOVEMENT_TYPES.IN,
                            MOVEMENT_TYPES.OUT,
                        ],
                    },
                },
                _sum: {
                    movementQty: true,
                },
            }),

            prisma.deliveries.groupBy({
                by: ["deliveryType"],
                where: {
                    deliveryType: {
                        in: [
                            DELIVERY_TYPES.IN,
                            DELIVERY_TYPES.OUT,
                        ],
                    },
                },
                _sum: {
                    deliveryQty: true,
                },
            }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                assignedStock: {
                    totalQty: assignedStock._sum.workOrderQty ?? 0,
                    totalCount: assignedStock._count.id,
                },

                spinningMovement: {
                    received:
                        spinningMovement.find(
                            (item) => item.movementType === MOVEMENT_TYPES.IN
                        )?._sum.movementQty ?? 0,

                    returned:
                        spinningMovement.find(
                            (item) => item.movementType === MOVEMENT_TYPES.OUT
                        )?._sum.movementQty ?? 0,
                },

                yarnMovement: {
                    delivered:
                        yarnMovement.find(
                            (item) => item.deliveryType === DELIVERY_TYPES.IN
                        )?._sum.deliveryQty ?? 0,

                    returned:
                        yarnMovement.find(
                            (item) => item.deliveryType === DELIVERY_TYPES.OUT
                        )?._sum.deliveryQty ?? 0,
                },
            },
        });

    } catch (error) {
        console.error("Stock status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve stock status",
        });
    }
};

const SPINNING_RECEIVED = 'Received From Spinning'
const SPINNING_RETURNED = 'Return To Spinning'
const DELIVERY_TO_KNITTING = 'Yarn Delivery'
const RETURN_FROM_KNITTING = 'Yarn Return'
const ASSIGNED_STATUS = 'ASSIGNED'

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const norm = (s?: string | null) => (s ?? '').trim().toUpperCase()
const isBlank = (s?: string | null) => !s || s.trim() === '' || s.trim().toUpperCase() === 'NULL'
const makeKey = (lot: string, count: string) => `${lot}__${count}`

type Row = {
  date: string
  supplierName: string
  yarnCount: string
  composition: string
  lot: string
  received: number
  returnSpinning: number
  assignQty: number
  assignBalance: number
  deliveryKnitting: number
  returnFromKnitting: number
  physicalBalance: number
}

export const yarnStockTable = async (req: Request, res: Response) => {
  try {
    const [movements, assignedComps, deliveries, stocks] = await Promise.all([
      prisma.spinningYarnMovement.findMany({
        select: {
          movementType: true,
          movementDate: true,
          movementQty: true,
          lotNo: true,
          yarnCount: true,
          yarnPoItems: {
            select: {
              composition: true,
              yarnPo: { select: { supplierName: true } },
            },
          },
        },
        orderBy: { movementDate: 'asc' },
      }),

      prisma.composition.groupBy({
        by: ['lotNo', 'yarnCount'],
        where: {
          status: ASSIGNED_STATUS,
          workOrder: { isCancelled: false },
          lotNo: { not: null },
        },
        _sum: { workOrderQty: true },
      }),

      prisma.deliveries.findMany({
        where: {
          OR: [
            { deliveryType: { equals: DELIVERY_TO_KNITTING, mode: 'insensitive' } },
            { deliveryType: { equals: RETURN_FROM_KNITTING, mode: 'insensitive' } },
          ],
        },
        select: {
          lotNo: true,
          deliveryQty: true,
          deliveryType: true,
          composition: { select: { lotNo: true, yarnCount: true } },
        },
      }),

      prisma.yarnStock.findMany({
        select: {
          supplierName: true,
          count: true,
          composition: true,
          lotNo: true,
          physicalBalanceQty: true,
        },
      }),
    ])

    const rows = new Map<string, Row>()
    const lotToKeys = new Map<string, string[]>()

    const getRow = (lot: string, count: string): Row => {
      const key = makeKey(lot, count)
      let row = rows.get(key)
      if (!row) {
        row = {
          date: '',
          supplierName: '',
          yarnCount: count,
          composition: '',
          lot,
          received: 0,
          returnSpinning: 0,
          assignQty: 0,
          assignBalance: 0,
          deliveryKnitting: 0,
          returnFromKnitting: 0,
          physicalBalance: 0,
        }
        rows.set(key, row)
        const keys = lotToKeys.get(lot) ?? []
        keys.push(key)
        lotToKeys.set(lot, keys)
      }
      return row
    }

    // 1) Spinning received / returned
    for (const m of movements) {
      const row = getRow(m.lotNo, m.yarnCount)
      const type = norm(m.movementType)
      const d = m.movementDate.toISOString().slice(0, 10)

      if (type === norm(SPINNING_RECEIVED)) {
        row.received += m.movementQty
        if (!row.date || d < row.date) row.date = d
      } else if (type === norm(SPINNING_RETURNED)) {
        row.returnSpinning += m.movementQty
        if (!row.date) row.date = d
      }

      if (!row.supplierName && m.yarnPoItems?.yarnPo?.supplierName) {
        row.supplierName = m.yarnPoItems.yarnPo.supplierName
      }
      if (!row.composition && m.yarnPoItems?.composition) {
        row.composition = m.yarnPoItems.composition
      }
    }

    // 2) Assigned qty
    for (const c of assignedComps) {
      if (isBlank(c.lotNo)) continue
      const row = getRow(c.lotNo as string, c.yarnCount ?? '')
      row.assignQty += c._sum.workOrderQty ?? 0
    }

    // 3) Knitting delivery / return
    for (const d of deliveries) {
      const lot = !isBlank(d.lotNo) ? (d.lotNo as string) : d.composition?.lotNo
      if (isBlank(lot)) continue

      const count = d.composition?.yarnCount ?? null
      let row: Row | undefined

      if (count && rows.has(makeKey(lot as string, count))) {
        row = rows.get(makeKey(lot as string, count))
      } else {
        const keys = lotToKeys.get(lot as string)
        row = keys?.length ? rows.get(keys[0]!) : getRow(lot as string, count ?? '')
      }
      if (!row) continue

      const type = norm(d.deliveryType)
      if (type === norm(DELIVERY_TO_KNITTING)) row.deliveryKnitting += d.deliveryQty
      else if (type === norm(RETURN_FROM_KNITTING)) row.returnFromKnitting += d.deliveryQty
    }

    // 4) Physical stock
    for (const s of stocks) {
      const row = getRow(s.lotNo, s.count)
      row.physicalBalance += s.physicalBalanceQty
      if (!row.supplierName) row.supplierName = s.supplierName
      if (!row.composition) row.composition = s.composition
    }

    // 5) Final calculations
    const data = Array.from(rows.values())
      .map((r) => ({
        ...r,
        received: round2(r.received),
        returnSpinning: round2(r.returnSpinning),
        assignQty: round2(r.assignQty),
        assignBalance: round2(r.received - r.returnSpinning - r.assignQty),
        deliveryKnitting: round2(r.deliveryKnitting),
        returnFromKnitting: round2(r.returnFromKnitting),
        physicalBalance: round2(r.physicalBalance),
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.lot.localeCompare(b.lot))

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('yarnStockTable error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch yarn stock table data',
    })
  }
}