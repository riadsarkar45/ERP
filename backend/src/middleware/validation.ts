import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { validationError } from "../utils/responseHandler";

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
        return res.status(400).json(validationError(messages));
      }
      return res.status(400).json(validationError("Invalid request data"));
    }
  };
};

export const jobDataSchema = z.object({
  jobNo: z.string().min(1, "Job number is required"),
  workOrderNo: z.string().min(1, "Work order number is required"),
  styleNo: z.string().min(1, "Style number is required"),
  orderType: z.string().min(1, "Order type is required"),
  compositions: z.array(z.object({
    composition: z.string(),
    color: z.string(),
    orderQty: z.string(),
    workOrderQty: z.string(),
    unitPrice: z.string(),
  })),
});

export const auditSchema = z.object({
  auditTitle: z.string().min(1, "Audit title is required"),
  auditStartDate: z.string().min(1, "Start date is required"),
  auditEndDate: z.string().min(1, "End date is required"),
  auditDesc: z.string().min(1, "Description is required"),
});

export const styleRequirementSchema = z.object({
  styleNo: z.string().min(1, "Style number is required"),
  buyerName: z.string().min(1, "Buyer name is required"),
});
