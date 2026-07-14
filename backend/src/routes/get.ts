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
import { deleteChallanFromDelivery } from "../controllers/deliveries/deleteDelivery";
import { GlanceReport } from "../controllers/Glance/atGlanceReport";
import { authenticate, authorize } from "../middleware/Authenticate.middleware";
import { partyData, partyViewData } from "../controllers/partyViewData/partyViewData";

const getRouters = express.Router();

console.log("getRouters loaded");

getRouters.get("/work-order/:orderType", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), getAllOrders);

getRouters.get("/dashboard-detail", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), dashboardController);

getRouters.get("/style-requirement", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), getOrderSummaryByStyle);

getRouters.get("/audits", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), allAudits);

getRouters.get("/jobs", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), getAllJobs);

getRouters.get("/styles", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), styleRequirements);

getRouters.get("/styles/:jobNo", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), styleRequirements);

getRouters.get("/deliveries/:orderType", apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), deliveryDetail);

getRouters.delete("/delete-delivery/:deliveryId", authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), deleteChallanFromDelivery)

getRouters.get("/glance-report", authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), GlanceReport);

getRouters.get("/party-view-report/:factoryName", partyViewData);

getRouters.get("/detail-party-report/:factoryName/:orderType", partyData);

export default getRouters;