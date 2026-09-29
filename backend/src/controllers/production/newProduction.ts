import type { Request, Response } from 'express';
import prisma from '../../database/prismaClient/prisma';

export const newProduction = async (req: Request, res: Response) => {
    try {
        // ==========================================
        // USER VALIDATION
        // ==========================================
        const userId = Number(req.user?.userId);

        if (!userId || isNaN(userId)) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
        }

        // ==========================================
        // REQUEST BODY
        // ==========================================
        const {
            date,
            jobNo,
            productionType,
            details,
        } = req.body;

        // ==========================================
        // VALIDATION
        // ==========================================
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Production date is required',
            });
        }

        if (!jobNo) {
            return res.status(400).json({
                success: false,
                message: 'Job number is required',
            });
        }

        if (!productionType) {
            return res.status(400).json({
                success: false,
                message: 'Production department is required',
            });
        }

        if (!details) {
            return res.status(400).json({
                success: false,
                message: 'Production details are required',
            });
        }

        // ==========================================
        // PRODUCTION DATE
        // ==========================================

        const dateString = String(date);

        // Handles:
        // 2026-09-29
        // 2026-09-29T00:00:00.000Z
        const datePart = dateString.substring(0, 10);

        const dateParts = datePart.split('-');

        if (dateParts.length !== 3) {
            return res.status(400).json({
                success: false,
                message: 'Invalid production date',
            });
        }

        const year = Number(dateParts[0]);
        const month = Number(dateParts[1]);
        const day = Number(dateParts[2]);

        if (
            !Number.isInteger(year) ||
            !Number.isInteger(month) ||
            !Number.isInteger(day) ||
            month < 1 ||
            month > 12 ||
            day < 1 ||
            day > 31
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid production date',
            });
        }

        // ==========================================
        // CURRENT TIME
        // ==========================================

        const now = new Date();

        /*
         * Keep selected production date
         * but use current server time.
         */
        const productionDate = new Date(
            year,
            month - 1,
            day,
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds()
        );

        if (isNaN(productionDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid production date',
            });
        }

        // ==========================================
        // NORMALIZE DETAILS
        // ==========================================

        const normalizedDetails = Array.isArray(details)
            ? details
            : [details];

        if (normalizedDetails.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Production details cannot be empty',
            });
        }

        // ==========================================
        // EXCLUDED KEYS
        // ==========================================

        const excludedKeys = new Set([
            'colorId',
            'color',
            'remarks',
        ]);

        // ==========================================
        // BUILD PRODUCTION ROWS
        // ==========================================

        const productionRows = normalizedDetails.flatMap(
            (item: any) => {
                const styleRequirementRowId =
                    Number(item.colorId);

                if (
                    !styleRequirementRowId ||
                    isNaN(styleRequirementRowId)
                ) {
                    return [];
                }

                return Object.entries(item)
                    .filter(([key, value]) => {
                        // Ignore metadata
                        if (excludedKeys.has(key)) {
                            return false;
                        }

                        // Ignore empty values
                        if (
                            value === null ||
                            value === undefined ||
                            value === ''
                        ) {
                            return false;
                        }

                        // Only numeric production values
                        const qty = Number(value);

                        return !isNaN(qty);
                    })
                    .map(([key, value]) => {
                        return {
                            productionType: key,

                            department: String(
                                productionType
                            ),

                            productionQty: Number(value),

                            productionDate,

                            createdBy: userId,

                            styleRequirementRowId,

                            jobNumber: String(jobNo),

                            remarks: item.remarks
                                ? String(item.remarks)
                                : '',
                        };
                    });
            }
        );

        // ==========================================
        // NOTHING TO INSERT
        // ==========================================

        if (productionRows.length === 0) {
            return res.status(400).json({
                success: false,
                message:
                    'No valid production quantity found',
            });
        }

        // ==========================================
        // DEBUG
        // ==========================================

        console.log(
            'Received date:',
            date
        );

        console.log(
            'Production date:',
            productionDate
        );

        console.log(
            'Production date ISO:',
            productionDate.toISOString()
        );

        console.log(
            productionRows,
            'Production rows before insert'
        );

        // ==========================================
        // INSERT
        // ==========================================

        const result =
            await prisma.productionData.createMany({
                data: productionRows,
            });

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).json({
            success: true,
            message: 'Production saved successfully',
            inserted: result.count,
        });

    } catch (error: any) {
        console.error(
            '❌ Error saving production:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to save production',
            errorDetails: error.message,
        });
    }
};