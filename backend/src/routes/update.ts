import express from "express";
import { updateOrders } from "../controllers/orders/updateOrders";
import { updateAuditStatus } from "../controllers/audit/updateAuditStatus";

const updateRouters = express.Router();

updateRouters.patch("/update-order/:orderId/:styleNo", updateOrders);

updateRouters.patch("/update-audit/:auditId/:status", updateAuditStatus);

export default updateRouters;