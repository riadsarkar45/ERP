import express from "express";
import { updateAuditStatus } from "../controllers/audit/updateAuditStatus";
import { updateJobStatus } from "../controllers/jobs/updateJobStatus";
import { updateJobs } from "../controllers/deliveries/newDelivery";
import { updateStyleReq } from "../controllers/newStyleRequirements/updateStyleRequires/updateStyleReq";

const updateRouters = express.Router();

updateRouters.patch("/update-order/:yarnId", updateJobs);

updateRouters.patch("/update-audit/:auditId/:status", updateAuditStatus);

updateRouters.patch("/job-status/:status/:jobId", updateJobStatus);

updateRouters.patch("/update-style-req/:jobId", updateStyleReq);

export default updateRouters;