import express from "express";
import multer from "multer";
import { createNewAudit } from "../controllers/audit/newAudit";
import { createNewStyleRequirement } from "../controllers/newStyleRequirements/createNewReq";
import { cuttingDataUpdate } from "../controllers/fabricCutting/fabricCuttingData";
import { createNewJob } from "../controllers/orders/createNewJob";
import { apiLimiter } from "../middleware/rateLimiter/apiLimiter";
import { trackRequests } from "../middleware/rateLimiter/trackRequest";
import { validateRequest, jobDataSchema, auditSchema, styleRequirementSchema } from "../middleware/validation";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/create-job", apiLimiter, validateRequest(jobDataSchema), createNewJob);

router.post("/create-new-audit", apiLimiter, validateRequest(auditSchema), createNewAudit);

router.post("/new-style-requirements", apiLimiter, validateRequest(styleRequirementSchema), createNewStyleRequirement);

router.post("/cutting-production", apiLimiter, cuttingDataUpdate);

export default router;