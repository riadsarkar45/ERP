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
import { styleReconciliation } from "../controllers/newStyleRequirements/styleReconciliation";
import { searchChallans } from "../controllers/movements/searchChallan";
import { responseTimeMonitor } from "../controllers/responseTime/responseTime";
import { hourlyChallanReport } from "../controllers/users/hrlyChallanReport";
import { hourlyDeliveryMovement } from "../controllers/users/hrlyDeliveryReport";
import { factoriesWithTotalWorkOrderQty } from "../controllers/orders/factoriesWorkOrderTotal";
import { getDeliveryTotals } from "../controllers/deliveries/allDeliveryTotals";
import { yarnStock, ydStock } from "../controllers/yarnStock/yarnStock";
import { pendingWorkOrders } from "../controllers/orders/pendingWorkOrder";
import { generateKnittingPdfWorkOrder } from "../controllers/orders/pdfWorkOrder";
import { allUsers } from "../controllers/users/allUser";
import { requestedData } from "../controllers/orders/requestedData";
import { downloadChallan, prepareToGenerate } from "../controllers/deliveries/generatePdfChallan";
import { balanceGlanceReport } from "../controllers/Glance/balanceGlanceReport";

const getRouters = express.Router();

console.log("getRouters loaded");

getRouters.get("/work-order/:orderType", responseTimeMonitor, apiLimiter, getAllOrders);

getRouters.get("/dashboard-detail", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), dashboardController);

getRouters.get("/style-requirement", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), getOrderSummaryByStyle);

getRouters.get("/audits", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), allAudits);

getRouters.get("/jobs", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), getAllJobs);

getRouters.get("/styles", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), styleRequirements);

getRouters.get("/styles/:jobNo", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), styleRequirements);

getRouters.get("/deliveries/:orderType", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), deliveryDetail);

getRouters.delete("/delete-delivery/:deliveryId", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), deleteChallanFromDelivery)

getRouters.get("/glance-report", responseTimeMonitor, apiLimiter, authenticate, authorize("SUPER ADMIN", "ADMIN", "AUDITOR", "FACTORY AUDITOR"), GlanceReport);

getRouters.get("/party-view-report/:factoryName", responseTimeMonitor, apiLimiter, partyViewData);

getRouters.get("/management-view/job-numbers", responseTimeMonitor, apiLimiter, getJobNumbers);
// specific route FIRST
getRouters.get("/management-view/:orderType", responseTimeMonitor, apiLimiter, managementReport);   // dynamic route AFTER

getRouters.get("/detail-party-report/:factoryName/:orderType", responseTimeMonitor, apiLimiter, partyData);

getRouters.get("/glance-report/:factoryName/:orderType", responseTimeMonitor, partyData);

getRouters.get("/management-view", responseTimeMonitor, partyData);

getRouters.get("/challan-movement/:orderType/", responseTimeMonitor, challanMovement);

getRouters.get("/challan-movement/:orderType/:noOrderType", responseTimeMonitor, challanMovement);

getRouters.get("/work-order/:orderType/filter-options/:column", responseTimeMonitor, getFilterOptions);

getRouters.get("/glance/filter-options/:columnName", responseTimeMonitor, getGlanceFilterOptions);

getRouters.get("/glance/:jobNo", responseTimeMonitor, styleRequirements);

getRouters.get("/mis/glance/detail/:columnName/:jobNo", responseTimeMonitor, misDetailView);

getRouters.get("/glance/:jobNo/trailing-data", responseTimeMonitor, styleReconciliation);

getRouters.get("/:orderType/challan/search", responseTimeMonitor, searchChallans);

getRouters.get("/:orderType/:noOrderType/challan/search", responseTimeMonitor, searchChallans);

getRouters.get("/reports/hourly-challan", responseTimeMonitor, hourlyChallanReport);

getRouters.get("/reports/daily-delivery", responseTimeMonitor, hourlyDeliveryMovement);

getRouters.get("/factories/workOrder/totals/:jobNo/:orderType", responseTimeMonitor, factoriesWithTotalWorkOrderQty);

getRouters.get("/delivery/type/total/:orderType", responseTimeMonitor, getDeliveryTotals);

getRouters.get("/total/yarn-stock", responseTimeMonitor, authenticate, yarnStock);

getRouters.get("/total/yd-stock", responseTimeMonitor, ydStock);

getRouters.get("/total/yarn-work-order", responseTimeMonitor, yarnStock);

getRouters.get("/total/yarn-work-order", responseTimeMonitor, yarnStock);

getRouters.get("/pending/work-order/:orderType", responseTimeMonitor, authenticate, pendingWorkOrders);

getRouters.get("/requested/work-order/:orderType", responseTimeMonitor, authenticate, pendingWorkOrders);

getRouters.get("/generate-pdf-work-order/:id", responseTimeMonitor, authenticate, generateKnittingPdfWorkOrder);

getRouters.get("/all-users", responseTimeMonitor, authenticate, allUsers);

getRouters.get("/requested-work-data", responseTimeMonitor, authenticate, requestedData);

getRouters.get("/prepare-to-download/:userId", responseTimeMonitor, authenticate, prepareToGenerate);

getRouters.get("/challan/download/:userId", responseTimeMonitor, authenticate, downloadChallan);

getRouters.get("/balance/sheet", responseTimeMonitor, balanceGlanceReport);

export default getRouters;