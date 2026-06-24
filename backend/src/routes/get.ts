import express from "express";
import { getAllOrders } from "../controllers/orders/getOrders";
import { dashboardController } from "../controllers/dashboard/dashboard";
import { getOrderSummaryByStyle } from "../controllers/orders/styleWiseOrder";
import { allAudits } from "../controllers/audit/allAudits";
import { getAllJobs } from "../controllers/jobs/allJobs";
import { styleRequirements } from "../controllers/newStyleRequirements/styleReqs";
import { deliveryDetail } from "../controllers/deliveries/fetchDeliveries";
import { apiLimiter } from "../middleware/rateLimiter/apiLimiter";
import { getDeliveryData } from "../controllers/deliveries/getDeliveryData";

const getRouters = express.Router();

console.log("getRouters loaded");

getRouters.get("/work-order/:orderType", apiLimiter, getAllOrders);

getRouters.get("/dashboard-detail", apiLimiter, dashboardController);

getRouters.get("/style-requirement", apiLimiter, getOrderSummaryByStyle);

getRouters.get("/audits", apiLimiter, allAudits);

getRouters.get("/jobs", apiLimiter, getAllJobs);

getRouters.get("/styles", apiLimiter, styleRequirements);

getRouters.get("/styles/:jobNo", apiLimiter, styleRequirements);

getRouters.get("/deliveries/:jobNumber/:orderType", apiLimiter, getDeliveryData);

export default getRouters;