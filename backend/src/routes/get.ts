import express from "express";
import { getAllOrders } from "../controllers/orders/getOrders";
import { dashboardController } from "../controllers/dashboard/dashboard";
import { getOrderSummaryByStyle } from "../controllers/orders/styleWiseOrder";

const getRouters = express.Router();

getRouters.get("/work-order/:orderType", getAllOrders);

getRouters.get("/dashboard-detail", dashboardController);

getRouters.get("/style-requirement", getOrderSummaryByStyle);

export default getRouters;