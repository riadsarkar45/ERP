import { Router } from "express";
import { getMe, login, logout, refresh, register } from "../../controllers/auth/auth.Controller";
import { authenticate, authorize } from "../../middleware/Authenticate.middleware";

const authRouter = Router();
authRouter.post("/auth/register", authenticate, authorize("SUPER ADMIN", "ADMIN"), register);
authRouter.post("/auth/login", login);
authRouter.post("/auth/logout", authenticate, logout);
authRouter.post("/auth/refresh", refresh)
authRouter.get("/auth/me", authenticate, getMe)
export default authRouter;