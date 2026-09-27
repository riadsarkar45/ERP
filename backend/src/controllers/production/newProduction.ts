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
        // BODY
        // ==========================================
        const {
            date,
            jobNo,
            productionType,
            details,
        } = req.body;

        // ==========================================
        // BASIC VALIDATION
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

        if (!details) {
            return res.status(400).json({
                success: false,
                message: 'Production details are required',
            });
        }

        // ==========================================
        // SUPPORT SINGLE OBJECT + ARRAY
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
        // THESE FIELDS ARE NOT PRODUCTION TYPES
        // ==========================================
        const excludedKeys = new Set([
            'colorId',
            'color',
            'remarks',
        ]);

        // ==========================================
        // BUILD DATABASE ROWS
        // ==========================================
        const productionRows = normalizedDetails.flatMap((item: any) => {

            const styleRequirementRowId = Number(item.colorId);

            if (
                !styleRequirementRowId ||
                isNaN(styleRequirementRowId)
            ) {
                return [];
            }

            return Object.entries(item)
                .filter(([key, value]) => {

                    // Ignore metadata fields
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

                    // Only accept numeric production values
                    const qty = Number(value);

                    return !isNaN(qty);
                })
                .map(([key, value]) => {

                    return {
                        productionType: key,

                        department: productionType,

                        productionQty: Number(value),

                        productionDate: new Date(date),

                        createdBy: userId,

                        styleRequirementRowId,

                        jobNumber: String(jobNo),

                        remarks: item.remarks
                            ? String(item.remarks)
                            : '',
                    };
                });
        });

        // ==========================================
        // NOTHING TO INSERT
        // ==========================================
        if (productionRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid production quantity found',
            });
        }

        console.log(
            productionRows,
            'Production rows before insert'
        );

        // ==========================================
        // INSERT ALL AT ONCE
        // ==========================================
        const result = await prisma.productionData.createMany({
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