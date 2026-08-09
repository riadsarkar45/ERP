import express from "express";
import { getAllOrders, getFilterOptions } from "../controllers/orders/getOrders";
import { dashboardController } from "../controllers/dashboard/dashboard";
import { getOrderSummaryByStyle } from "../controllers/orders/styleWiseOrder";
import { allAudits } from "../controllers/audit/allAudits";
import { getAllJobs } from "../controllers/jobs/allJobs";
import { getGlanceFilterOptions, styleRequirements } from "../controllers/newStyleRequirements/styleReqs";
import { deliveryDetail } from "../controllers/deliveries/fetchDeliveries";
import { apiLimiter } from "../middleware/rateLimiter/apiLimiter";
import { getDeliveryData } from "../controllers/deliveries/getDeliveryData";
import { deleteChallanFromDelivery } from "../controllers/deliveries/deleteDelivery";
import { GlanceReport } from "../controllers/Glance/atGlanceReport";
import { authenticate, authorize } from "../middleware/Authenticate.middleware";
import { partyData, partyViewData } from "../controllers/partyViewData/partyViewData";
import { challanMovement } from "../controllers/movements/challanMovement";
import { getJobNumbers, managementReport } from "../controllers/mis/managementReport";
import { misDetailView } from "../controllers/mis/misDetail";

const getRouters = express.Router();

console.log("getRouters loaded");

getRouters.get("/work-order/:orderType", apiLimiter, getAllOrders);

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

getRouters.get("/management-view/job-numbers", getJobNumbers); 
    // specific route FIRST
getRouters.get("/management-view/:orderType", managementReport);   // dynamic route AFTER

getRouters.get("/detail-party-report/:factoryName/:orderType", partyData);

getRouters.get("/glance-report/:factoryName/:orderType", partyData);

getRouters.get("/management-view", partyData);

getRouters.get("/challan-movement/:orderType", challanMovement);

getRouters.get("/work-order/:orderType/filter-options/:column", getFilterOptions);

getRouters.get("/glance/filter-options/:columnName", getGlanceFilterOptions);

getRouters.get("/glance/:jobNo", styleRequirements);

getRouters.get("/mis/glance/detail/:columnName/:jobNo", misDetailView);

export default getRouters;