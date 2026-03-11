import express from "express";
import multer from "multer";
// import { fileUpload } from "../controllers/uploads/uploadOrdersFile";
import { createNewOrder } from "../controllers/orders/createNewOrder";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// router.post("/upload", upload.single("file"), fileUpload);

router.post("/create-new-order", createNewOrder)

export default router;