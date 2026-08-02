import express from "express";
import multer from "multer";
import { createNewAudit } from "../controllers/audit/newAudit";
import { createNewStyleRequirement } from "../controllers/newStyleRequirements/createNewReq";
import { cuttingDataUpdate } from "../controllers/fabricCutting/fabricCuttingData";
import { createNewJob } from "../controllers/orders/newWorkOrder";
import { fileUpload } from "../controllers/uploads/uploadOrdersFile";
import { generateBill } from "../controllers/generateBill/generatebill";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), fileUpload as any);

router.post("/create-job", createNewJob)

router.post("/create-new-audit", createNewAudit)

router.post("/new-style-requirements", createNewStyleRequirement)

router.post("/cutting-production", cuttingDataUpdate)

router.post("/generate-bill", generateBill);


export default router;