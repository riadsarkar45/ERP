import express from "express";
import { updateAuditStatus } from "../controllers/audit/updateAuditStatus";
import { updateJobStatus } from "../controllers/jobs/updateJobStatus";
import { updateJobs } from "../controllers/deliveries/newDelivery";
import { updateStyleReq } from "../controllers/newStyleRequirements/updateStyleRequires/updateStyleReq";
import { updateWorkOrder } from "../controllers/orders/update/updateWorkOrder";
import { authenticate, authorize } from "../middleware/Authenticate.middleware";
import { styleReconciliation } from "../controllers/newStyleRequirements/styleReconciliation";
import { responseTimeMonitor } from "../controllers/responseTime/responseTime";
import { requestForApproval } from "../controllers/orders/requestForApproval";
import { editChallan } from "../controllers/movements/update.challan";
import { editStyleRequirement } from "../controllers/newStyleRequirements/editStyleRequirement";
import { userActiveInActive } from "../controllers/users/allUser";

const updateRouters = express.Router();

updateRouters.patch("/update-order", responseTimeMonitor, authenticate, updateJobs);

updateRouters.patch("/update-audit/:auditId/:status", responseTimeMonitor, authenticate, updateAuditStatus);

updateRouters.patch("/job-status/:status/:jobId", responseTimeMonitor, authenticate, updateJobStatus);

updateRouters.patch("/update-style-req/:jobId", responseTimeMonitor, authenticate, updateStyleReq);

updateRouters.patch("/update-work-order/:workOrderId", responseTimeMonitor, authenticate, updateWorkOrder);

updateRouters.patch("/styles/:jobNo/reconciliation", responseTimeMonitor, authenticate, authorize("styleRequirements", [
  "reconciliationSubmission"
]), styleReconciliation);

updateRouters.patch("/request-for-approval/:requestType/:workOrderId/:requestToId", responseTimeMonitor, authenticate, requestForApproval);

updateRouters.patch("/edit-challan", responseTimeMonitor, authenticate, editChallan);

updateRouters.put("/edit-style-requirement", responseTimeMonitor, authenticate, authorize("styleRequirements", [
    "infoEdit"
  ]), editStyleRequirement)

updateRouters.patch("/update-user-activity/:userId/:status", responseTimeMonitor, authenticate, userActiveInActive)

export default updateRouters;