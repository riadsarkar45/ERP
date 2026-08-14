import { Router } from "express";
import { getMe, login, logout, refresh, register } from "../../controllers/auth/auth.Controller";
import { authenticate, authorize } from "../../middleware/Authenticate.middleware";
import { responseTimeMonitor } from "../../controllers/responseTime/responseTime";

const authRouter = Router();
authRouter.post("/auth/register", responseTimeMonitor, authenticate, authorize("SUPER ADMIN", "ADMIN"), register);
authRouter.post("/auth/login", responseTimeMonitor, login);
authRouter.post("/auth/logout", responseTimeMonitor, authenticate, logout);
authRouter.post("/auth/refresh", responseTimeMonitor, refresh)
authRouter.get("/auth/me", responseTimeMonitor, authenticate, getMe)
export default authRouter;