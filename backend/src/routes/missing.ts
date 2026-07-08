import express from "express";
const router = express.Router();
import multer from "multer";
import * as missingController from "../controllers/missingController";
import * as uploadController from "../controllers/uploadController";
import {  protect  } from "../middleware/auth";

// 🟢 เปลี่ยนเป็นใช้ MemoryStorage เพื่อให้ Controller สามารถอ่าน req.file.buffer ได้
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 📌 API สำหรับดึงรายการ + สร้างข้อมูลบุคคลสูญหายรายเดียว
router.get("/", missingController.getMissingPersons);
router.post("/", protect, upload.fields([{ name: "photo", maxCount: 1 }, { name: "passport_photo", maxCount: 1 }, { name: "pjv_file", maxCount: 1 }]), missingController.createMissingPerson);

// 📌 API สำหรับอัปโหลด Excel
router.post("/upload", protect, upload.single("file"), uploadController.uploadMissingExcel);
router.get("/upload-progress/:jobId", uploadController.getUploadProgress);

// 📌 API สำหรับดึงข้อมูลบุคคลสูญหายรายเดียว และ แก้ไขข้อมูล
router.get("/:id", missingController.getMissingPersonById);
router.put("/:id", protect, upload.fields([{ name: "photo", maxCount: 1 }, { name: "passport_photo", maxCount: 1 }, { name: "pjv_file", maxCount: 1 }]), missingController.updateMissingPerson);
router.delete("/:id", protect, missingController.deleteMissingPerson);

export default router;