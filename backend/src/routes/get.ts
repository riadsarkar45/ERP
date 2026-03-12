import express from "express";
import { getAllOrders } from "../controllers/orders/getOrders";

const getRouters = express.Router();

getRouters.get("/work-order/:orderType", getAllOrders);

export default getRouters;