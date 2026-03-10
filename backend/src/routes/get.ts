import express from "express";
import { getAllOrders } from "../controllers/orders/getOrders";

const getRouters = express.Router();

getRouters.get("/work-order", getAllOrders);

export default getRouters;