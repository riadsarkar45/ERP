import prisma from "../../database/prismaClient/prisma";

interface ChallanValidationResult {
    success: boolean;
    message?: string;
    duplicate?: any;
}

export const challanValidation = async (
    challanNo: number,
    workOrderId: string,
    toFactory: string
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

    const duplicate = await prisma.deliveries.findFirst({
        where: {
            challanNo: Number(challanNo),
            toFactory,
        },
    });

    if (duplicate) {
        return {
            success: false,
            message: "This challan already exists for this factory.",
            duplicate,
        };
    }

    return {
        success: true,
    };
};