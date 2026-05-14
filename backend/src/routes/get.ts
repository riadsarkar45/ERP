import express from "express";
import { getAllOrders } from "../controllers/orders/getOrders";
import { dashboardController } from "../controllers/dashboard/dashboard";
import { getOrderSummaryByStyle } from "../controllers/orders/styleWiseOrder";
import { allAudits } from "../controllers/audit/allAudits";
import { getAllJobs } from "../controllers/jobs/allJobs";
import { styleRequirements } from "../controllers/newStyleRequirements/styleReqs";
import { deliveryDetail } from "../controllers/deliveries/deliveries";

const getRouters = express.Router();

console.log("getRouters loaded");

getRouters.get("/work-order/:orderType", getAllOrders);

getRouters.get("/dashboard-detail", dashboardController);

getRouters.get("/style-requirement", getOrderSummaryByStyle);

getRouters.get("/audits", allAudits);

getRouters.get("/jobs", getAllJobs);

getRouters.get("/styles", styleRequirements);

getRouters.get("/styles/:jobNo", styleRequirements);

getRouters.get("/deliveries/:id", deliveryDetail);

export default getRouters;