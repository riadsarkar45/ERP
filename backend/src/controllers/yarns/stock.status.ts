import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

const MOVEMENT_TYPES = {
    IN: "Received From Spinning",
    OUT: "Return To Spinning",
} as const;

const DELIVERY_TYPES = {
    IN: "Yarn Delivery",
    OUT: "Yarn Return",
    FINISH_RECEIVED: "Finish Received",
    YARN_RECEIVED_FROM_YD: "Yarn Received From YD",
    YARN_DELIVERY: "Yarn Delivery",
    YARN_RETURN: "Yarn Return",
    YARN_DELIVERY_FOR_YD: "Yarn Delivery For Yarn Dye",
} as const;

// challanNo used for the opening-stock rows imported from the YARN STOCK sheet
const OPENING_CHALLAN_NO = 0;

// Stock start date = the day the opening stock was loaded. The opening stock is
// today's physical balance, so yarn deliveries/returns made BEFORE that day are
// already inside it and must not be subtracted again.
// Returns null when no opening stock exists (then all deliveries count).
const getStockStartDate = async (): Promise<Date | null> => {
    const opening = await prisma.spinningYarnMovement.aggregate({
        where: {
            movementType: MOVEMENT_TYPES.IN,
            challanNo: OPENING_CHALLAN_NO,
        },
        _min: {
            movementDate: true,
        },
    });

    const first = opening._min.movementDate;
    if (!first) return null;

    return new Date(
        Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), first.getUTCDate())
    );
};

export const stockStatus = async (req: Request, res: Response) => {
    try {
        const stockStartDate = await getStockStartDate();

        const sinceStart = stockStartDate
            ? { deliveryDate: { gte: stockStartDate } }
            : {};

        const [
            compositions,
            spinningMovement,
            yarnMovementSinceStart,
        ] = await Promise.all([
            // Assigned work orders and their delivered quantities
            prisma.composition.findMany({
                where: {
                    status: "ASSIGNED",
                },
                select: {
                    workOrderQty: true,
                    deliveries: {
                        where: {
                            deliveryType: DELIVERY_TYPES.IN,
                        },
                        select: {
                            deliveryQty: true,
                        },
                    },
                },
            }),

            // Spinning movement summary (opening stock is stored here too,
            // as "Received From Spinning" rows)
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
                _count: {
                    _all: true,
                },
            }),

            // Knitting delivery and return summary since the stock start date
            // (used for the physical stock calculation)
            prisma.deliveries.groupBy({
                by: ["deliveryType"],
                where: {
                    deliveryType: {
                        in: [
                            DELIVERY_TYPES.IN,
                            DELIVERY_TYPES.OUT,
                            DELIVERY_TYPES.YARN_DELIVERY_FOR_YD,
                        ],
                    },
                    ...sinceStart,
                },
                _sum: {
                    deliveryQty: true,
                },
            }),
        ]);

        // --------------------------------------------------
        // 1. Assigned quantity and assignment balance
        // --------------------------------------------------

        let assignedQty = 0;
        let deliveredAgainstAssignment = 0;

        for (const composition of compositions) {
            const workOrderQty = Number(composition.workOrderQty ?? 0);

            const deliveredQty = composition.deliveries.reduce(
                (sum, delivery) => sum + Number(delivery.deliveryQty ?? 0),
                0
            );

            assignedQty += workOrderQty;
            deliveredAgainstAssignment += deliveredQty;
        }

        const assignedCount = compositions.length;

        // --------------------------------------------------
        // 2. Spinning movement totals
        // --------------------------------------------------

        const spinningReceivedRow = spinningMovement.find(
            (item) => item.movementType === MOVEMENT_TYPES.IN
        );

        const spinningReceived =
            spinningReceivedRow?._sum.movementQty ?? 0;

        const spinningReceivedCount =
            spinningReceivedRow?._count._all ?? 0;

        const spinningReturned =
            spinningMovement.find(
                (item) => item.movementType === MOVEMENT_TYPES.OUT
            )?._sum.movementQty ?? 0;

        // --------------------------------------------------
        // 3. Knitting movement totals
        // --------------------------------------------------

        const stockYarnDelivered =
            yarnMovementSinceStart.find(
                (item) => item.deliveryType === DELIVERY_TYPES.IN
            )?._sum.deliveryQty ?? 0;

        const stockYarnReturned =
            yarnMovementSinceStart.find(
                (item) => item.deliveryType === DELIVERY_TYPES.OUT
            )?._sum.deliveryQty ?? 0;

        const stockYarnDyeDelivered =
            yarnMovementSinceStart.find(
                (item) =>
                    item.deliveryType === DELIVERY_TYPES.YARN_DELIVERY_FOR_YD
            )?._sum.deliveryQty ?? 0;

        // --------------------------------------------------
        // 4. Physical stock calculation (from movements only)
        //    stock = received from spinning (incl. opening stock)
        //            - return to spinning
        //            - yarn delivery - yarn delivery for yarn dye
        //            + yarn return
        //    Deliveries/returns counted only from the stock start date.
        // --------------------------------------------------

        const spinningNetStock = spinningReceived - spinningReturned;

        const totalStock =
            spinningReceived -
            spinningReturned -
            stockYarnDelivered -
            stockYarnDyeDelivered +
            stockYarnReturned;

        // --------------------------------------------------
        // 5. Assignment balance
        // --------------------------------------------------

        // Assign balance = physical stock - assigned qty
        const assignBalance = Number(totalStock) - assignedQty;

        const reservedQty = Math.max(assignBalance, 0);

        // Available stock after reservation
        const availableStock = Number(totalStock) - reservedQty;

        // --------------------------------------------------
        // 6. Reconciliation
        // --------------------------------------------------

        const overDeliveredQty = Math.max(
            deliveredAgainstAssignment - assignedQty,
            0
        );

        // --------------------------------------------------
        // 7. Response
        // --------------------------------------------------

        return res.status(200).json({
            success: true,
            data: {
                assignedStock: {
                    totalQty: assignedQty,
                    totalCount: assignedCount,
                },

                assignBalance: {
                    totalQty: assignBalance,
                },

                reservedStock: {
                    totalQty: reservedQty,
                    totalCount: assignedCount,
                },

                availableStock: {
                    totalQty: availableStock,
                    totalCount: spinningReceivedCount,
                },

                totalStock: {
                    totalQty: totalStock,
                },

                spinningMovement: {
                    received: spinningReceived,
                    returned: spinningReturned,
                    netMovement:
                        spinningReceived - spinningReturned,
                },

                // Deliveries/returns counted in the stock (since stockStartDate)
                yarnMovement: {
                    delivered: stockYarnDelivered,
                    returned: stockYarnReturned,
                    netMovement:
                        stockYarnReturned - stockYarnDelivered,
                },

                // "Yarn Delivery For Yarn Dye" since stockStartDate (also deducted from stock)
                yarnDyeDelivery: {
                    delivered: stockYarnDyeDelivered,
                },

                stockStartDate: stockStartDate
                    ? stockStartDate.toISOString().slice(0, 10)
                    : null,

                // Key kept so the frontend does not break. It now comes from
                // spinningYarnMovement (net received − returned, and the number
                // of "Received From Spinning" rows), not from the yarnStock table.
                enteredStock: {
                    totalQty: spinningNetStock,
                    totalCount: spinningReceivedCount,
                },

                reconciliation: {
                    deliveredAgainstAssignment,
                    overDeliveredQty,
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
const DELIVERY_FOR_YARN_DYE = "YARN DELIVERY FOR YARN DYE";
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

  // Opening stock is now stored as "Received From Spinning" movements
  // (PI "OPENING-<SUPPLIER>"), so it is already inside `received`.
  // Kept at 0 so existing frontend code reading this field does not break.
  openingStock: number;

  deliveryKnitting: number;
  returnFromKnitting: number;

  // "Yarn Delivery For Yarn Dye" (also deducted from stock)
  deliveryForYd: number;

  // Not available at PI level.
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

    // Same rule as stockStatus: deliveries before the opening-stock date
    // are already inside the opening stock.
    const stockStartDate = await getStockStartDate();

    const [movements, assignedComps, deliveries] = await Promise.all([

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
          ...(stockStartDate
            ? { deliveryDate: { gte: stockStartDate } }
            : {}),
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
            {
              deliveryType: {
                equals: DELIVERY_FOR_YARN_DYE,
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

          openingStock: 0,

          deliveryKnitting: 0,
          returnFromKnitting: 0,
          deliveryForYd: 0,

          physicalBalance: null,
        };

        rows.set(key, row);
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

      } else if (type === DELIVERY_FOR_YARN_DYE) {

        row.deliveryForYd +=
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
      target.deliveryForYd += orphan.deliveryForYd;

      if (
        orphan.date &&
        (!target.date || orphan.date < target.date)
      ) {
        target.date = orphan.date;
      }

      rows.delete(orphanKey);
    }

    // --------------------------------------------------
    // 8. FINAL RESPONSE
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

        const openingStock = round2(
          row.openingStock
        );

        const deliveryKnitting = round2(
          row.deliveryKnitting
        );

        const returnFromKnitting = round2(
          row.returnFromKnitting
        );

        const deliveryForYd = round2(
          row.deliveryForYd
        );

        return {
          ...row,

          received,

          returnSpinning,

          assignQty,

          openingStock,

          assignBalance: round2(
            received +
            openingStock -
            returnSpinning -
            assignQty
          ),

          deliveryKnitting,

          returnFromKnitting,

          deliveryForYd,

          // (received + opening stock) - returned to spinning
          // - delivered to knitting - delivered for yarn dye
          // + returned from knitting
          calculatedPhysicalBalance: round2(
            received +
            openingStock -
            returnSpinning -
            deliveryKnitting -
            deliveryForYd +
            returnFromKnitting
          ),

          // true = no spinning records for this row,
          // so the balance cannot be trusted.
          noSpinningRecord:
            received === 0 &&
            returnSpinning === 0 &&
            openingStock === 0,
        };
      })
      .sort((a, b) =>
        a.date.localeCompare(b.date) ||
        a.piNo.localeCompare(b.piNo) ||
        a.lot.localeCompare(b.lot) ||
        a.yarnCount.localeCompare(b.yarnCount)
      );

    return res.status(200).json({
      success: true,

      total: data.length,

      data,

      // Kept (empty) so existing frontend code reading it does not break.
      // Stock now comes only from spinningYarnMovement.
      lotPhysicalBalances: [],
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