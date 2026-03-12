import express from "express";
import multer from "multer";
// import { fileUpload } from "../controllers/uploads/uploadOrdersFile";
import { createNewOrder } from "../controllers/orders/createNewOrder";
import { createNewAudit } from "../controllers/audit/newAudit";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// router.post("/upload", upload.single("file"), fileUpload);

router.post("/create-new-order", createNewOrder)

router.post("/create-new-audit", createNewAudit)

export default router;