import express from "express";
import { getAllOrders } from "../controllers/orderController";

const getRouters = express.Router();

getRouters.get("/work-order", getAllOrders);

export default getRouters;