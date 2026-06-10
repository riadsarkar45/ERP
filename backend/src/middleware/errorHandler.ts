import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../utils/responseHandler";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message || "Internal server error";

  return res.status(statusCode).json(errorResponse(message));
};
