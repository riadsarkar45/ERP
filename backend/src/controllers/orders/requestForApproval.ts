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





export const requestForDebitNoteApproval = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { requestType, debitNoteId, requestToId } = req.params;

    // Authenticated user
    const userId = Number(req.user?.userId);

    // Convert route params to numbers
    const recipientId = Number(requestToId);
    const noteId = Number(debitNoteId);

    // Validate authenticated user
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Unauthorized",
        type: "err",
      });
    }

    // Validate request type
    if (requestType !== "debitNoteApproval") {
      return res.status(400).json({
        message: "Invalid Debit Note approval request type",
        type: "err",
      });
    }

    // Validate recipient ID
    if (!Number.isInteger(recipientId) || recipientId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID to send approval request",
        type: "err",
      });
    }

    // Validate Debit Note ID
    if (!Number.isInteger(noteId) || noteId <= 0) {
      return res.status(400).json({
        message: "Invalid Debit Note ID",
        type: "err",
      });
    }

    // Prevent requesting approval from yourself
    if (recipientId === userId) {
      return res.status(400).json({
        message: "You cannot send an approval request to yourself",
        type: "err",
      });
    }

    // Create the approval request and update the Debit Note atomically
    const approvalRequest = await prisma.$transaction(async (tx) => {
      // Check whether the recipient exists
      const recipient = await tx.user.findUnique({
        where: {
          id: recipientId,
        },
        select: {
          id: true,
        },
      });

      if (!recipient) {
        throw new Error("APPROVAL_RECIPIENT_NOT_FOUND");
      }

      // Check whether the Debit Note exists
      const debitNote = await tx.debitNote.findUnique({
        where: {
          id: noteId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!debitNote) {
        throw new Error("DEBIT_NOTE_NOT_FOUND");
      }

      // Only draft Debit Notes can be submitted
      if (debitNote.status !== "DRAFT") {
        throw new Error("DEBIT_NOTE_NOT_DRAFT");
      }

      // Create request in the Debit Note approval table ONLY
      const request = await tx.debitNoteApprovalRequest.create({
        data: {
          requestedBy: userId,
          requestTo: recipientId,
          requestType: "debitNoteApproval",
          debitNoteId: noteId,
        },
      });

      // Update the Debit Note status
      await tx.debitNote.update({
        where: {
          id: noteId,
        },
        data: {
          status: "PENDING",
          submittedAt: new Date(),
        },
      });

      return request;
    });

    return res.status(200).json({
      message: "Debit Note approval request sent successfully",
      data: approvalRequest,
      type: "success",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      switch (error.message) {
        case "APPROVAL_RECIPIENT_NOT_FOUND":
          return res.status(404).json({
            message: "Approval recipient not found",
            type: "err",
          });

        case "DEBIT_NOTE_NOT_FOUND":
          return res.status(404).json({
            message: "Debit Note not found",
            type: "err",
          });

        case "DEBIT_NOTE_NOT_DRAFT":
          return res.status(409).json({
            message: "Only draft Debit Notes can be submitted for approval",
            type: "err",
          });
      }
    }

    console.error("Debit Note approval request error:", error);

    return res.status(500).json({
      message: "Failed to send Debit Note approval request",
      type: "err",
    });
  }
};
