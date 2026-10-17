import express from "express";
import { authenticate } from "../../middleware/Authenticate.middleware";
import { mobileDashboard } from "../../mobile/controllers/dashboard";

const getMobileRouters = express.Router();

console.log("mobile routers loaded");

getMobileRouters.get("/mobile-dashboard", mobileDashboard);


export default getMobileRouters;