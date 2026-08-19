import express from "express";
import multer from "multer";
import { createNewAudit } from "../controllers/audit/newAudit";
import { createNewStyleRequirement } from "../controllers/newStyleRequirements/createNewReq";
import { cuttingDataUpdate } from "../controllers/fabricCutting/fabricCuttingData";
import { createNewJob } from "../controllers/orders/newWorkOrder";
import { fileUpload } from "../controllers/uploads/uploadOrdersFile";
import { generateBill } from "../controllers/generateBill/generatebill";
import { responseTimeMonitor } from "../controllers/responseTime/responseTime";
import { authenticate } from "../middleware/Authenticate.middleware";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", responseTimeMonitor, upload.single("file"), fileUpload as any);

router.post("/create-job", responseTimeMonitor, authenticate, createNewJob)

router.post("/create-new-audit", responseTimeMonitor, createNewAudit)

router.post("/new-style-requirements", responseTimeMonitor, authenticate, createNewStyleRequirement)

router.post("/cutting-production", responseTimeMonitor, cuttingDataUpdate)

router.post("/generate-bill", responseTimeMonitor, generateBill);


export default router;