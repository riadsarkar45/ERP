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




const SPINNING_RECEIVED = "RECEIVED FROM SPINNING";
const SPINNING_RETURNED = "RETURN TO SPINNING";
const DELIVERY_TO_KNITTING = "YARN DELIVERY";
const RETURN_FROM_KNITTING = "YARN RETURN";
const ASSIGNED_STATUS = "ASSIGNED";

const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalize = (value?: string | null): string =>
  (value ?? "").trim().toUpperCase();

const clean = (value?: string | null): string =>
  !value || !value.trim() || normalize(value) === "NULL"
    ? ""
    : value.trim();

const makeKey = (
  piNo: string,
  lotNo: string,
  yarnCount: string
): string =>
  JSON.stringify([
    normalize(piNo),
    normalize(lotNo),
    normalize(yarnCount),
  ]);

const makeLotKey = (
  lotNo: string,
  yarnCount: string
): string =>
  JSON.stringify([
    normalize(lotNo),
    normalize(yarnCount),
  ]);

const toDateString = (date: Date): string =>
  date.toISOString().slice(0, 10);

type YarnStockRow = {
  date: string;
  supplierName: string;
  piNo: string;
  lcNo: string;
  yarnCount: string;
  composition: string;
  lot: string;

  received: number;
  returnSpinning: number;
  assignQty: number;
  assignBalance: number;

  deliveryKnitting: number;
  returnFromKnitting: number;

  // Not available from yarnStock at PI level.
  physicalBalance: null;
};

type PiMetadata = {
  piNo: string;
  lcNo: string;
  supplierName: string;
};

export const yarnStockTable = async (
  req: Request,
  res: Response
) => {
  try {
    // 1. FETCH REQUIRED DATA

    const [movements, assignedComps, deliveries, stocks,] = await Promise.all([

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

              yarnPo: {
                select: {
                  piNo: true,
                  lcNo: true,
                  supplierName: true,
                },
              },
            },
          },
        },

        orderBy: {
          movementDate: "asc",
        },
      }),

      prisma.composition.groupBy({
        by: [
          "piId",
          "lotNo",
          "yarnCount",
        ],

        where: {
          status: ASSIGNED_STATUS,

          workOrder: {
            isCancelled: false,
          },

          lotNo: {
            not: null,
          },
        },

        _sum: {
          workOrderQty: true,
        },
      }),

      prisma.deliveries.findMany({
        where: {
          OR: [
            {
              deliveryType: {
                equals: DELIVERY_TO_KNITTING,
                mode: "insensitive",
              },
            },
            {
              deliveryType: {
                equals: RETURN_FROM_KNITTING,
                mode: "insensitive",
              },
            },
          ],
        },

        select: {
          piId: true,
          lotNo: true,
          deliveryQty: true,
          deliveryType: true,
          deliveryDate: true,

          composition: {
            select: {
              piId: true,
              lotNo: true,
              yarnCount: true,
            },
          },
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
    ]);

    // 2. COLLECT PI NUMBERS

    const piNumbers = new Set<string>();

    for (const movement of movements) {
      const piNo = clean(
        movement.yarnPoItems?.yarnPo?.piNo
      );

      if (piNo) piNumbers.add(piNo);
    }

    for (const composition of assignedComps) {
      const piNo = clean(composition.piId);

      if (piNo) piNumbers.add(piNo);
    }

    for (const delivery of deliveries) {
      const piNo =
        clean(delivery.piId) ||
        clean(delivery.composition?.piId);

      if (piNo) piNumbers.add(piNo);
    }

    // 3. FETCH PI MASTER INFORMATION

    const piMasters = piNumbers.size
      ? await prisma.yarnPoModel.findMany({
        where: {
          piNo: {
            in: Array.from(piNumbers),
          },
        },

        select: {
          piNo: true,
          lcNo: true,
          supplierName: true,
        },
      })
      : [];

    const piMetadata = new Map<string, PiMetadata>();

    for (const pi of piMasters) {
      piMetadata.set(normalize(pi.piNo), {
        piNo: pi.piNo,
        lcNo: clean(pi.lcNo),
        supplierName: clean(pi.supplierName),
      });
    }

    // 4. PREPARE AGGREGATION MAPS

    const rows = new Map<string, YarnStockRow>();

    // PI + Lot + Count -> row key
    const lotCountKeys = new Map<string, Set<string>>();

    const getRow = (
      piNo: string,
      lotNo: string,
      yarnCount: string
    ): YarnStockRow => {

      const key = makeKey(
        piNo,
        lotNo,
        yarnCount
      );

      let row = rows.get(key);

      if (!row) {
        const metadata = piMetadata.get(
          normalize(piNo)
        );

        row = {
          date: "",

          supplierName:
            metadata?.supplierName ?? "",

          piNo:
            metadata?.piNo ?? piNo,

          lcNo:
            metadata?.lcNo ?? "",

          yarnCount,
          composition: "",
          lot: lotNo,

          received: 0,
          returnSpinning: 0,

          assignQty: 0,
          assignBalance: 0,

          deliveryKnitting: 0,
          returnFromKnitting: 0,

          physicalBalance: null,
        };

        rows.set(key, row);

        const lotKey = makeLotKey(
          lotNo,
          yarnCount
        );

        let keys = lotCountKeys.get(lotKey);

        if (!keys) {
          keys = new Set<string>();
          lotCountKeys.set(lotKey, keys);
        }

        keys.add(key);
      }

      return row;
    };

    const updateDate = (
      row: YarnStockRow,
      date: Date
    ) => {
      const formatted = toDateString(date);

      if (!row.date || formatted < row.date) {
        row.date = formatted;
      }
    };

    // 5. SPINNING RECEIVED / RETURNED

    for (const movement of movements) {

      const lotNo = clean(movement.lotNo);

      if (!lotNo) continue;

      const yarnCount = clean(movement.yarnCount);

      const piNo = clean(
        movement.yarnPoItems?.yarnPo?.piNo
      );

      const row = getRow(
        piNo,
        lotNo,
        yarnCount
      );

      const type = normalize(movement.movementType);

      if (type === SPINNING_RECEIVED) {

        row.received += movement.movementQty;

      } else if (type === SPINNING_RETURNED) {

        row.returnSpinning += movement.movementQty;

      } else {
        continue;
      }

      updateDate(row, movement.movementDate);

      if (!row.composition) {
        row.composition = clean(
          movement.yarnPoItems?.composition
        );
      }
    }

    // 6. ASSIGNED QUANTITY (PI-WISE)

    for (const composition of assignedComps) {

      const lotNo = clean(composition.lotNo);

      if (!lotNo) continue;

      const piNo = clean(composition.piId);

      const yarnCount = clean(
        composition.yarnCount
      );

      const row = getRow(
        piNo,
        lotNo,
        yarnCount
      );

      row.assignQty +=
        composition._sum.workOrderQty ?? 0;
    }

    // 7. KNITTING DELIVERY / RETURN (PI-WISE)

    for (const delivery of deliveries) {

      const lotNo =
        clean(delivery.lotNo) ||
        clean(delivery.composition?.lotNo);

      if (!lotNo) continue;

      const yarnCount = clean(
        delivery.composition?.yarnCount
      );

      const piNo =
        clean(delivery.piId) ||
        clean(delivery.composition?.piId);

      const row = getRow(
        piNo,
        lotNo,
        yarnCount
      );

      const type = normalize(
        delivery.deliveryType
      );

      if (type === DELIVERY_TO_KNITTING) {

        row.deliveryKnitting +=
          delivery.deliveryQty;

      } else if (type === RETURN_FROM_KNITTING) {

        row.returnFromKnitting +=
          delivery.deliveryQty;

      } else {
        continue;
      }

      updateDate(row, delivery.deliveryDate);
    }

    // 7.5 MERGE ORPHAN ROWS
    //
    // An "orphan" row has assigned/delivery quantities but no spinning
    // received/returned quantity. This usually happens when the PI or
    // yarn count text differs between the spinning movement and the
    // delivery/composition, so they end up on different row keys.
    //
    // We only merge when there is exactly ONE possible target row for
    // the same lot, so we never guess between several candidates.

    const isOrphan = (row: YarnStockRow): boolean =>
      row.received === 0 && row.returnSpinning === 0;

    for (const [orphanKey, orphan] of Array.from(rows.entries())) {

      if (!isOrphan(orphan)) continue;

      const lotName = normalize(orphan.lot);

      const candidates = Array.from(rows.entries()).filter(
        ([key, row]) =>
          key !== orphanKey &&
          !isOrphan(row) &&
          normalize(row.lot) === lotName
      );

      const tiers = [
        // 1) same lot + same PI
        candidates.filter(
          ([, row]) =>
            normalize(row.piNo) === normalize(orphan.piNo)
        ),

        // 2) same lot + same yarn count
        candidates.filter(
          ([, row]) =>
            normalize(row.yarnCount) ===
            normalize(orphan.yarnCount)
        ),

        // 3) same lot only
        candidates,
      ];

      const match = tiers.find((tier) => tier.length === 1);

      if (!match) continue;

      const target = match[0]![1];

      target.assignQty += orphan.assignQty;
      target.deliveryKnitting += orphan.deliveryKnitting;
      target.returnFromKnitting += orphan.returnFromKnitting;

      if (
        orphan.date &&
        (!target.date || orphan.date < target.date)
      ) {
        target.date = orphan.date;
      }

      rows.delete(orphanKey);

      lotCountKeys
        .get(makeLotKey(orphan.lot, orphan.yarnCount))
        ?.delete(orphanKey);
    }

    // 8. LOT-LEVEL PHYSICAL STOCK

    const physicalStock = new Map<
      string,
      {
        lotNo: string;
        yarnCount: string;
        supplierName: string;
        composition: string;
        physicalBalance: number;
      }
    >();

    for (const stock of stocks) {

      const lotNo = clean(stock.lotNo);

      if (!lotNo) continue;

      const yarnCount = clean(stock.count);

      const key = makeLotKey(
        lotNo,
        yarnCount
      );

      let existing = physicalStock.get(key);

      if (!existing) {
        existing = {
          lotNo,
          yarnCount,
          supplierName: clean(stock.supplierName),
          composition: clean(stock.composition),
          physicalBalance: 0,
        };

        physicalStock.set(key, existing);
      }

      existing.physicalBalance +=
        stock.physicalBalanceQty;
    }

    // Include stock-only lots without inventing a PI.
    for (const stock of physicalStock.values()) {

      const hasPiRows = lotCountKeys.get(
        makeLotKey(stock.lotNo, stock.yarnCount)
      );

      if (!hasPiRows?.size) {

        const row = getRow(
          "",
          stock.lotNo,
          stock.yarnCount
        );

        row.supplierName = stock.supplierName;
        row.composition = stock.composition;
      }
    }

    // --------------------------------------------------
    // 9. FINAL RESPONSE
    // --------------------------------------------------

    const data = Array.from(rows.values())
      .map((row) => {

        const received = round2(row.received);

        const returnSpinning = round2(
          row.returnSpinning
        );

        const assignQty = round2(
          row.assignQty
        );

        const deliveryKnitting = round2(
          row.deliveryKnitting
        );

        const returnFromKnitting = round2(
          row.returnFromKnitting
        );

        return {
          ...row,

          received,

          returnSpinning,

          assignQty,

          assignBalance: round2(
            received -
            returnSpinning -
            assignQty
          ),

          deliveryKnitting,

          returnFromKnitting,

          // received - returned to spinning - delivered + returned back
          calculatedPhysicalBalance: round2(
            received -
            returnSpinning -
            deliveryKnitting +
            returnFromKnitting
          ),

          // true = this row has no spinning received/returned qty,
          // so its balance is not reliable (check PI / lot / count data).
          noSpinningRecord:
            received === 0 && returnSpinning === 0,
        };
      })
      .sort((a, b) =>
        a.date.localeCompare(b.date) ||
        a.piNo.localeCompare(b.piNo) ||
        a.lot.localeCompare(b.lot) ||
        a.yarnCount.localeCompare(b.yarnCount)
      );

    const lotPhysicalBalances = Array.from(
      physicalStock.values()
    ).map((stock) => ({
      ...stock,
      physicalBalance: round2(
        stock.physicalBalance
      ),
    }));

    return res.status(200).json({
      success: true,

      total: data.length,

      data,

      // Separate lot-level stock summary.
      // Do not sum this alongside PI rows.
      lotPhysicalBalances,
    });

  } catch (error) {

    console.error(
      "yarnStockTable error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch yarn stock table data",
    });
  }
};