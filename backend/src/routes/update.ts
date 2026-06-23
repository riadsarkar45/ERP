import express from "express";
import { updateAuditStatus } from "../controllers/audit/updateAuditStatus";
import { updateJobStatus } from "../controllers/jobs/updateJobStatus";
import { updateJobs } from "../controllers/deliveries/newDelivery";

const updateRouters = express.Router();

updateRouters.patch("/update-order/:yarnId", updateJobs);

updateRouters.patch("/update-audit/:auditId/:status", updateAuditStatus);

updateRouters.patch("/job-status/:status/:jobId", updateJobStatus);

export default updateRouters;