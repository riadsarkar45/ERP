import prisma from "../../database/prismaClient/prisma";
import type { Request, Response } from "express";

export const requestedData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { orderType } = req.params as { orderType: string };

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const requestedData =
      await prisma.workOrderApprovalRequest.findMany({
        where: {
          requestTo: Number(userId),
          workOrder: {
            orderType,
            isRequested: true,
          },
        },
        select: {
          id: true,
          requestType: true,
          requestAt: true,
          byUser: {
            select: {
              id: true,
              name: true,
            },
          },
          workOrder: {
            select: {
              id: true,
              jobNo: true,
              factoryName: true,
              lotNo: true,
              machineDia: true,
              stichLength: true,
              yarnCount: true,
              isRequested: true,
              compositions: {
                select: {
                  composition: true,
                  unitePrice: true,
                  color: true,
                  workOrderQty: true,
                },
              },
            },
          },
        },
      });

    return res.status(200).json(requestedData);
  } catch (error) {
    console.error("Failed to get requested data:", error);

    return res.status(500).json({
      message: "Failed to get requested data",
    });
  }
};

// Debit Note approval requests
export const requestedDebitNotes = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userId = Number(req.user?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Unauthorized",
        type: "err",
      });
    }

    const requestedDebitNotes =
      await prisma.debitNoteApprovalRequest.findMany({
        where: {
          requestTo: userId,
          requestType: "debitNoteApproval",
          debitNote: {
            is: {
              status: "PENDING",
            },
          },
        },
        orderBy: {
          requestAt: "desc",
        },
        select: {
          id: true,
          requestType: true,
          requestAt: true,

          byUser: {
            select: {
              id: true,
              name: true,
              designation: true,
            },
          },

          debitNote: {
            select: {
              id: true,
              noteNo: true,
              title: true,
              content: true,
              status: true,
              submittedAt: true,
              createdAt: true,
              updatedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  designation: true,
                },
              },
            },
          },
        },
      });

    return res.status(200).json(requestedDebitNotes);
  } catch (error) {
    console.error("Failed to get requested Debit Notes:", error);

    return res.status(500).json({
      message: "Failed to get requested Debit Notes",
      type: "err",
    });
  }
};