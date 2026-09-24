import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../../database/prismaClient/prisma";
import { calculateOrdersForStyleSummary } from "../../utils/yarnCompStat";

const DIRECT_FIELDS = new Set([
    "jobNo",
    "styleNo",
    "buyerName",
    "salesContact",
    "poNo",
]);

const ROWS_RELATION_FIELDS = new Set(["color", "composition"]);

type StyleFilters = Record<string, string[]>;

const buildWhereClause = (
    jobNo: string | undefined,
    filters: StyleFilters | undefined
): Prisma.StyleRequirementWhereInput => {
    const where: any = {
        isReconciliationDone: false,
        ...(jobNo ? { jobNo } : {}),
    };

    if (!filters) return where;

    const rowLevelConditions: any = {};
    let hasRowLevelConditions = false;

    for (const [columnName, values] of Object.entries(filters)) {
        if (!values || values.length === 0) continue;

        if (DIRECT_FIELDS.has(columnName)) {
            where[columnName] = { in: values };
        } else if (ROWS_RELATION_FIELDS.has(columnName)) {
            rowLevelConditions[columnName] = { in: values };
            hasRowLevelConditions = true;
        } else if (columnName === "manufacturingUnite") {
            rowLevelConditions.reconciliation = {
                manufacturingUnite: { in: values }
            };
            hasRowLevelConditions = true;
        }
    }

    // Deep filtering: Ensure a SINGLE row matches ALL row-level conditions simultaneously
    if (hasRowLevelConditions) {
        where.rows = {
            some: rowLevelConditions
        };
    }

    return where;
};

export const styleRequirements = async (req: Request, res: Response) => {
    try {
        const requestStart = process.hrtime.bigint();

        const { jobNo } = req.params as { jobNo: string | undefined };
        const recon = req.query.reconciliation === 'true';
        const { filters: filtersParam } = req.query as { filters?: string };

        let filters: StyleFilters | undefined;
        if (filtersParam) {
            try {
                filters = JSON.parse(filtersParam);
            } catch {
                return res.status(400).json({
                    type: "error",
                    message: "Invalid filters JSON",
                });
            }
        }

        const whereClause = buildWhereClause(jobNo, filters);

        const [styles, total] = await Promise.all([
            prisma.styleRequirement.findMany({
                where: whereClause,
                orderBy: { id: "desc" },
                take: 40,
                select: {
                    salesContact: true,
                    styleNo: true,
                    buyerName: true,
                    jobNo: true,
                    processLoss: true,
                    poNo: true,
                    ...recon && {
                        dateOfReconciliation: true,
                    },
                    id: true,
                    rows: {
                        select: {
                            id: true,
                            color: true,
                            composition: true,
                            finishDia: true,
                            orderQty: true,
                            finishRequiredQty: true,
                            additional: true,
                            processLoss:true,
                            ...recon && {
                                reconciliation: {
                                    select: {
                                        id: true,
                                        submittedDate: true,
                                        actualCuttingQty: true,
                                        cadConsumption: true,
                                        cuttingToSewingInput: true,
                                        fabricIssueCuttingDept: true,
                                        finishInputQty: true,
                                        finishOutputQty: true,
                                        note: true,
                                        packingInputQty: true,
                                        packingOutputQty: true,
                                        physicalFound: true,
                                        physicalFoundLeftOver: true,
                                        plannedCuttingQty: true,
                                        plannedLeftOverQty: true,
                                        sewingInputQty: true,
                                        sewingOutputQty: true,
                                        shippedQty: true,
                                        manufacturingUnite: true,
                                        sentForEmbellishment: true,
                                        receivedFromEmbellishment: true,
                                    }
                                }
                            }
                        },
                    },
                    workOrders: {
                        select: {
                            orderType: true,
                            compositions: {
                                select: {
                                    color: true,
                                    styleRequirementRowId: true,
                                    composition: true,
                                    workOrderQty: true,
                                    additional: true,
                                    id: true,
                                    deliveries: {
                                        select: {
                                            deliveryType: true,
                                            deliveryQty: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.styleRequirement.count({
                where: whereClause,
            }),
        ]);

        const summaryData = calculateOrdersForStyleSummary(styles);
        const totalMs = Number(process.hrtime.bigint() - requestStart) / 1_000_000;

        return res.status(200).send({
            data: summaryData,
            type: "success",
            totalMs: totalMs
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: "error",
            message: "Internal server error",
        });
    }
};

export const getGlanceFilterOptions = async (req: Request, res: Response) => {
    try {
        const { columnName } = req.params as { columnName: string };
        const { filters: filtersParam } = req.query as { filters?: string };

        let otherFilters: StyleFilters | undefined;
        if (filtersParam) {
            try {
                otherFilters = JSON.parse(filtersParam);
            } catch {
                return res.status(400).json({
                    type: "error",
                    message: "Invalid filters JSON",
                });
            }
        }

        const filterableFields = new Set([
            ...DIRECT_FIELDS,
            ...ROWS_RELATION_FIELDS,
            "manufacturingUnite"
        ]);

        if (!filterableFields.has(columnName)) {
            return res.status(400).json({
                type: "error",
                message: `Column "${columnName}" is not filterable`,
            });
        }

        const scopingWhere = buildWhereClause(undefined, otherFilters);

        let values: string[] = [];

        if (DIRECT_FIELDS.has(columnName)) {
            const rows = await prisma.styleRequirement.findMany({
                where: scopingWhere,
                distinct: [columnName as any],
                select: {
                    [columnName]: true,
                } as any,
            });

            values = rows
                .map((row: any) => row[columnName])
                .filter(
                    (value: unknown): value is string =>
                        typeof value === "string" && value.length > 0
                );
        } else if (ROWS_RELATION_FIELDS.has(columnName)) {
            const rows = await prisma.styleRequirementRow.findMany({
                where: {
                    styleRequirement: scopingWhere,
                } as any,
                distinct: [columnName as any],
                select: {
                    [columnName]: true,
                } as any,
            });

            values = rows
                .map((row: any) => row[columnName])
                .filter(
                    (value: unknown): value is string =>
                        typeof value === "string" && value.length > 0
                );
        } else if (columnName === "manufacturingUnite") {
            const rows = await prisma.styleRequirementRow.findMany({
                where: {
                    styleRequirement: scopingWhere,
                    reconciliation: {
                        isNot: null
                    }
                },
                select: {
                    reconciliation: {
                        select: {
                            manufacturingUnite: true
                        }
                    }
                },
            });

            const rawValues = rows
                .map((row: any) => row.reconciliation?.manufacturingUnite)
                .filter(
                    (value: unknown): value is string =>
                        typeof value === "string" && value.trim().length > 0
                );

            // Remove duplicates and sort
            values = Array.from(new Set(rawValues)).sort((a, b) => a.localeCompare(b));
        }

        values.sort((a, b) => a.localeCompare(b));

        return res.status(200).json({
            data: values,
            type: "success",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            type: "error",
            message: "Internal server error",
        });
    }
};