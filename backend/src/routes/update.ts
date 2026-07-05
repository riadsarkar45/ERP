import express from "express";
import { updateAuditStatus } from "../controllers/audit/updateAuditStatus";
import { updateJobStatus } from "../controllers/jobs/updateJobStatus";
import { updateJobs } from "../controllers/deliveries/newDelivery";
import { updateStyleReq } from "../controllers/newStyleRequirements/updateStyleRequires/updateStyleReq";
import { updateWorkOrder } from "../controllers/orders/update/updateWorkOrder";
import { authenticate, authorize } from "../middleware/Authenticate.middleware";

const updateRouters = express.Router();

updateRouters.patch("/update-order", authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"),  updateJobs);

updateRouters.patch("/update-audit/:auditId/:status", authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"),  updateAuditStatus);

updateRouters.patch("/job-status/:status/:jobId", authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"),  updateJobStatus);

updateRouters.patch("/update-style-req/:jobId", authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"), updateStyleReq);

updateRouters.patch("/update-work-order/:workOrderId", authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"),  updateWorkOrder); 

export default updateRouters;