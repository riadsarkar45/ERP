import express from "express";
import { getAllOrders } from "../controllers/orders/getOrders";
import { dashboardController } from "../controllers/dashboard/dashboard";

const getRouters = express.Router();

getRouters.get("/work-order/:orderType", getAllOrders);

getRouters.get("/dashboard-detail", dashboardController);

export default getRouters;