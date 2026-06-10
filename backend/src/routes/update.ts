import express from "express";
import { updateJobs } from "../controllers/orders/updateOrders";
import { updateAuditStatus } from "../controllers/audit/updateAuditStatus";
import { updateJobStatus } from "../controllers/jobs/updateJobStatus";
import { apiLimiter } from "../middleware/rateLimiter/apiLimiter";

const updateRouters = express.Router();

updateRouters.patch("/update-order/:yarnId", apiLimiter, updateJobs);

updateRouters.patch("/update-audit/:auditId/:status", apiLimiter, updateAuditStatus);

updateRouters.patch("/job-status/:status/:jobId", apiLimiter, updateJobStatus);

export default updateRouters;