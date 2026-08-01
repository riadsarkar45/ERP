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
    fromFactory: string, // 🔥 ADDED: needed to validate the reverse (receiving) direction
    yarnId: number,
    deliveryType: string
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

    // The work order's factory must be on ONE side of the transaction —
    // either receiving (toFactory) for an outbound delivery, or
    // sending back (fromFactory) for a return/receipt.
    const isOutbound = workOrder.factoryName === toFactory;
    const isReturn = workOrder.factoryName === fromFactory;

    if (!isOutbound && !isReturn) {
        return {
            success: false,
            message: `Invalid factory. This work order belongs to "${workOrder.factoryName}", which is neither the sending nor receiving factory on this delivery.`,
        };
    }

    const duplicate = await prisma.deliveries.findFirst({
        where: {
            challanNo: Number(challanNo),
            toFactory,
            fromFactory, // 🔥 scope duplicate check to the full direction too, not just toFactory
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