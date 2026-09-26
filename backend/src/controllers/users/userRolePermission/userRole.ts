import type { Request, Response } from 'express';
import prisma from '../../../database/prismaClient/prisma';

const MASTER_PERMISSIONS: Record<string, string[]> = {
    workOrders: ['knittingOrder', 'yarnDyeingOrder', 'dyeingOrder', 'aopOrder', 'workOrderDeliveries', 'readOnly'],
    mis: ['knittingOrder', 'yarnDyeingOrder', 'dyeingOrder', 'aopOrder', 'readOnly'],
    workOrderApproval: ['workOrderReq', 'workOrderApp', 'revisedWorkOrder', 'printWorkOrder', 'cancelWorkOrder', 'readOnly'],
    styleRequirements: ['addJob', 'reconciliation', 'bookingView', 'balanceSheet', 'infoEdit', 'reconciliationSubmission', 'readOnly'],
    yarn: ['yarnPurchase', 'yarnMovement', 'rawYarnMovement', 'rawYarnStock', 'ydMovement', 'ydStock', 'readOnly'],
    productionDataReport: ['summary', 'dailyCuttingUpdate', 'dailySewingUpdate', 'dailyFinishingUpdate', 'dailyExportUpdate', 'infoEdit', 'readOnly'],
    production: ['summary', 'dailyCuttingUpdate', 'dailySewingUpdate', 'dailyFinishingUpdate', 'dailyExportUpdate', 'infoEdit', 'readOnly'],
    partyWiseView: ['knittingFilter', 'knittingDataExport', 'dyeingFilter', 'dyeingDataExport', 'aopFilter', 'aopDataExport', 'readOnly'],
    movementBilling: ['qtyEdit', 'billingMake', 'billApproved', 'challanInfoExport', 'priceChange', 'billInfoSee', 'aopOrder', 'dyeingOrder', 'knittingOrder'],
    userManagement: ['addNewUser', 'setUserPermission', 'deleteExistingUser'],
};

type SectionPayload = {
    enabled: boolean;
    items: Record<string, boolean>;
};

export const userRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const rawUserId = req.params.userId ?? req.body?.userId;
        const userId = Number(rawUserId);

        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(400).json({ success: false, message: 'Invalid user id' });
            return;
        }

        const permissions = req.body?.permissions as Record<string, SectionPayload> | undefined;

        if (!permissions || typeof permissions !== 'object' || Object.keys(permissions).length === 0) {
            res.status(400).json({ success: false, message: 'Permissions payload is required' });
            return;
        }

        for (const sectionKey of Object.keys(permissions)) {
            if (!MASTER_PERMISSIONS[sectionKey]) {
                res.status(400).json({ success: false, message: `Unknown section "${sectionKey}"` });
                return;
            }
        }

        await prisma.$transaction(async (tx) => {
            for (const [sectionKey, section] of Object.entries(permissions)) {
                if (!section.enabled) {
                    await tx.permissionSection.deleteMany({
                        where: { userId, permittedSection: sectionKey },
                    });
                    continue;
                }

                // Find-or-create the section row.
                let sectionRow: { id: number } | null = await tx.permissionSection.findFirst({
                    where: { userId, permittedSection: sectionKey },
                    select: { id: true },
                });

                const allowedItems = new Set(MASTER_PERMISSIONS[sectionKey]);
                const payloadItems = section.items ?? {};

                // Only look at what's already stored for THIS section's items,
                // so we can diff against it — never touch anything not sent.
                const existingItems = sectionRow
                    ? await tx.isPermitted.findMany({
                          where: { permissionSectionId: sectionRow.id },
                          select: { isPermitted: true },
                      })
                    : [];
                const currentlyGranted = new Set(existingItems.map((i) => i.isPermitted));

                const toAdd: string[] = [];
                const toRemove: string[] = [];

                for (const itemKey of Object.keys(payloadItems)) {
                    if (!allowedItems.has(itemKey)) continue; // unknown key for this section, ignore

                    const desired = payloadItems[itemKey] === true;
                    const alreadyGranted = currentlyGranted.has(itemKey);

                    if (desired && !alreadyGranted) toAdd.push(itemKey);
                    if (!desired && alreadyGranted) toRemove.push(itemKey);
                }

                // Work out what would be left granted after applying the diff.
                const finalGranted = new Set(currentlyGranted);
                for (const itemKey of toRemove) finalGranted.delete(itemKey);
                for (const itemKey of toAdd) finalGranted.add(itemKey);

                if (finalGranted.size === 0) {
                    // No items left permitted -> the section itself should go away,
                    // regardless of the `enabled` flag sent.
                    if (sectionRow) {
                        await tx.isPermitted.deleteMany({
                            where: { permissionSectionId: sectionRow.id },
                        });
                        await tx.permissionSection.delete({
                            where: { id: sectionRow.id },
                        });
                    }
                    continue;
                }

                // We know at least one item will remain, so create the section row now if needed.
                if (!sectionRow) {
                    sectionRow = await tx.permissionSection.create({
                        data: { userId, permittedSection: sectionKey },
                        select: { id: true },
                    });
                }

                const sectionId: number = sectionRow.id;

                if (toRemove.length > 0) {
                    await tx.isPermitted.deleteMany({
                        where: { permissionSectionId: sectionId, isPermitted: { in: toRemove } },
                    });
                }

                if (toAdd.length > 0) {
                    await tx.isPermitted.createMany({
                        data: toAdd.map((itemKey) => ({
                            permissionSectionId: sectionId,
                            isPermitted: itemKey,
                        })),
                        skipDuplicates: true,
                    });
                }
            }
        }, { maxWait: 15000, timeout: 30000 });

        const formattedData = await getFormattedPermissions(userId);
        res.status(200).json({ success: true, message: 'Saved', permissions: formattedData });
    } catch (error) {
        console.error('[ERROR] Save permissions:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getUserPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.params.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(400).json({ success: false, message: 'Invalid user id' });
            return;
        }

        const formattedData = await getFormattedPermissions(userId);
        res.status(200).json({ success: true, permissions: formattedData });
    } catch (error) {
        console.error('[ERROR] Fetch permissions:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

async function getFormattedPermissions(userId: number): Promise<Record<string, { enabled: boolean; items: Record<string, boolean> }>> {
    const dbData = await prisma.permissionSection.findMany({
        where: { userId },
        include: { isPermitted: true },
    });

    const result: Record<string, { enabled: boolean; items: Record<string, boolean> }> = {};
    for (const [sectionKey, itemKeys] of Object.entries(MASTER_PERMISSIONS)) {
        const items: Record<string, boolean> = {};
        for (const itemKey of itemKeys) items[itemKey] = false;
        result[sectionKey] = { enabled: false, items };
    }

    for (const section of dbData) {
        const state = result[section.permittedSection];
        if (!state) continue;

        state.enabled = true;
        for (const perm of section.isPermitted) {
            if (perm.isPermitted in state.items) {
                state.items[perm.isPermitted] = true;
            }
        }
    }

    return result;
}