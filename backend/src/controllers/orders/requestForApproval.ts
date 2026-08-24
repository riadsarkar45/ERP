import type { Request, Response } from "express";
import prisma from "../../database/prismaClient/prisma";

export const requestForApproval = async (req: Request, res: Response) => {
    const { requestType, workOrderId, requestToId, } = req.params;
    // :requestType/:workOrderId
    const userId = req.user?.userId;
    if (!userId) {
        return res.status(401).send({ message: "Un Authorized" })
    }
    if (!requestToId) {
        return res.status(404).send({ message: "No user found to send request", type: "err" })
    }
    if (!workOrderId) {
        return res.status(404).send({ message: "No order type found to send request", type: "err" })
    }

    if (typeof requestType !== "string") {
        return res.status(400).send({ message: "Invalid request type" })
    }

    const convertReqIdToNumber = Number(requestToId)

    const sendRequest = await prisma.workOrderApprovalRequest.create({
        data: {
            requestedBy: Number(userId),
            requestTo: convertReqIdToNumber,
            requestType: requestType,
            workOrderId: Number(workOrderId)
        }
    })

    if (sendRequest) {
        const updateWorkOrder = await prisma.workOrder.update({
            where: { id: Number(workOrderId) },
            data: {
                isRequested: true,
                approvedBy: Number(userId),
            }
        })

        if (updateWorkOrder) {
            return res.status(200).send({
                message: "Approval request sent successfully",
                data: sendRequest
            })
        }
    }

    return res.status(500).send({ message: "Failed to send approval request" })
}