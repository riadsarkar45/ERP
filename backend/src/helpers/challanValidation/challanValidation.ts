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
    yarnId: number // 🔥 ADDED: needed to scope duplicate check per composition
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

    // 🔥 CHANGED: duplicate check is now scoped to challanNo + toFactory + yarnId.
    // A single challan can legitimately cover multiple compositions in the same
    // shipment (e.g. "Submit All" submits several open compositions with the same
    // challan number). We only want to flag it as a duplicate if the SAME
    // composition is being submitted twice against the same challan/factory.
    const duplicate = await prisma.deliveries.findFirst({
        where: {
            challanNo: Number(challanNo),
            toFactory,
            yarnId: Number(yarnId),
        },
    });

    if (duplicate) {
        return {
            success: false,
            message: "This challan already exists for this composition and factory.",
            duplicate,
        };
    }

    return {
        success: true,
    };
};