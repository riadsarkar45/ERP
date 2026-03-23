import express from "express";
import { updateOrders } from "../controllers/orders/updateOrders";

const updateRouters = express.Router();

updateRouters.patch("/update-order/:orderId/:styleNo", updateOrders);

export default updateRouters;