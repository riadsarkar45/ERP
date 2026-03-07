import express from "express";
import multer from "multer";
import { fileUpload } from "../controllers/uploads/upload";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), fileUpload);

export default router;