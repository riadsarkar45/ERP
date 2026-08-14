import express from "express";
import { updateAuditStatus } from "../controllers/audit/updateAuditStatus";
import { updateJobStatus } from "../controllers/jobs/updateJobStatus";
import { updateJobs } from "../controllers/deliveries/newDelivery";
import { updateStyleReq } from "../controllers/newStyleRequirements/updateStyleRequires/updateStyleReq";
import { updateWorkOrder } from "../controllers/orders/update/updateWorkOrder";
import { authenticate, authorize } from "../middleware/Authenticate.middleware";
import { styleReconciliation } from "../controllers/newStyleRequirements/styleReconciliation";
import { responseTimeMonitor } from "../controllers/responseTime/responseTime";

const updateRouters = express.Router();

updateRouters.patch("/update-order",responseTimeMonitor, authenticate,  updateJobs);

updateRouters.patch("/update-audit/:auditId/:status", responseTimeMonitor,authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"),  updateAuditStatus);

updateRouters.patch("/job-status/:status/:jobId",responseTimeMonitor, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"),  updateJobStatus);

updateRouters.patch("/update-style-req/:jobId",responseTimeMonitor, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"), updateStyleReq);

updateRouters.patch("/update-work-order/:workOrderId",responseTimeMonitor, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR"),  updateWorkOrder); 

// ✅ CORRECT: No trailing space
updateRouters.patch("/styles/:jobNo/reconciliation",responseTimeMonitor, styleReconciliation);
export default updateRouters;