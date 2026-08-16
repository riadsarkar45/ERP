import prisma from "../../database/prismaClient/prisma";

interface ChallanValidationResult {
    success: boolean;
    message?: string;
    duplicate?: any;
}

// Mirrors FACTORY_OPTIONAL_DELIVERY_TYPES in the frontend (Deliveries.jsx)
// and updateJobs.ts — these are internal processing steps, not
// factory-to-factory movements, so toFactory/fromFactory arrive as "" and
// there's no work-order factory to match against either side.
const FACTORY_OPTIONAL_DELIVERY_TYPES = new Set([
    "Received From Compacting",
    "Received From Reprocess",
    "Received From HEAT Set",
]);

const isFactoryOptional = (deliveryType: string) =>
    FACTORY_OPTIONAL_DELIVERY_TYPES.has(deliveryType);

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

    // Compacting/Reprocess/HEAT Set are internal process steps with no
    // to/from factory — skip the sending/receiving factory match check
    // for these types instead of comparing workOrder.factoryName against
    // an empty string (which would always fail).
    if (!isFactoryOptional(deliveryType)) {
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
    }

    const duplicate = await prisma.deliveries.findFirst({
        where: {
            challanNo: Number(challanNo),
            toFactory,
            fromFactory,
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