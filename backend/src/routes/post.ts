import express from "express";
import multer from "multer";
// import { fileUpload } from "../controllers/uploads/uploadOrdersFile";
import { createNewAudit } from "../controllers/audit/newAudit";
import { createNewStyleRequirement } from "../controllers/newStyleRequirements/createNewReq";
import { cuttingDataUpdate } from "../controllers/fabricCutting/fabricCuttingData";
import { createNewJob } from "../controllers/orders/createNewJob";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// router.post("/upload", upload.single("file"), fileUpload);

router.post("/create-job", createNewJob)

router.post("/create-new-audit", createNewAudit)

router.post("/new-style-requirements", createNewStyleRequirement)

router.post("/cutting-production", cuttingDataUpdate)

export default router;