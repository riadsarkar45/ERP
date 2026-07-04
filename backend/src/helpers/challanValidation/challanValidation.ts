import prisma from "../../database/prismaClient/prisma";

interface ChallanValidationResult {
    success: boolean;
    message?: string;
    duplicate?: any;
}

export const challanValidation = async (
    challanNo: number,
    workOrderId: string,
    toFactory: string,
    yarnId: number,
    deliveryType: string // 🔥 ADDED: same challan can legitimately cover multiple delivery types
): Promise<ChallanValidationResult> => {
    const workOrder = await prisma.workOrder.findFirst({
        where: {
            id: Number(workOrderId),
        },
        select: {
            factoryName: true,
        },
    });

    if (!workOrder) {
        return {
            success: false,
            message: "Invalid work order.",
        };
    }

    if (workOrder.factoryName !== toFactory) {
        return {
            success: false,
            message: `Invalid destination factory. This work order belongs to "${workOrder.factoryName}".`,
        };
    }

    // 🔥 CHANGED: duplicate check now scoped to challanNo + toFactory + yarnId + deliveryType.
    // A single challan can legitimately cover multiple delivery types for the SAME
    // composition (e.g. a "normal" delivery and a "return" both filed under the same
    // challan/shipment). Only flag a duplicate if the exact same composition + delivery
    // type is being submitted twice against the same challan/factory.
    const duplicate = await prisma.deliveries.findFirst({
        where: {
            challanNo: Number(challanNo),
            toFactory,
            yarnId: Number(yarnId),
            deliveryType,
        },
    });

    if (duplicate) {
        return {
            success: false,
            message: `This challan already has a "${deliveryType}" delivery for this composition and factory.`,
            duplicate,
        };
    }

    return {
        success: true,
    };
};