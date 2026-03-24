import express from "express";
import { getAllOrders } from "../controllers/orders/getOrders";
import { dashboardController } from "../controllers/dashboard/dashboard";
import { getOrderSummaryByStyle } from "../controllers/orders/styleWiseOrder";
import { allAudits } from "../controllers/audit/allAudits";

const getRouters = express.Router();

console.log("getRouters loaded");

getRouters.get("/work-order/:orderType", getAllOrders);

getRouters.get("/dashboard-detail", dashboardController);

getRouters.get("/style-requirement", getOrderSummaryByStyle);

getRouters.get("/audits", allAudits);

export default getRouters;