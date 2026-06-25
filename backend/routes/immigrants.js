// backend/routes/immigrants.js

const express = require("express");
const router = express.Router();
const multer = require("multer");

// นำเข้า Controller 
const immigrantController = require("../controllers/immigrantController");
const illegalController = require("../controllers/illegalController");
const deportedController = require("../controllers/deportedController");

const uploadMiddleware = require("../middleware/upload");
// 🟢 เพิ่มนำเข้า Middleware protect เพื่อเช็ค User จาก Token
const { protect } = require("../middleware/auth"); 

const memoryStorage = multer.memoryStorage();
const uploadExcel = multer({ storage: memoryStorage });

// ----------------------------------------------------
// ข้อมูลรวม & Dashboard
// ----------------------------------------------------
router.get("/", immigrantController.getAllData);
router.get("/dashboard", immigrantController.getDashboardData);

// ----------------------------------------------------
// Illegal (แอบเข้าเมือง)
// ----------------------------------------------------
router.get("/illegal/:id", illegalController.getIllegalById);
// 🟢 ใส่ protect เข้าไปก่อนหน้าฟังก์ชัน controller
router.post("/illegal", protect, uploadMiddleware.single("photo"), illegalController.createIllegal);
router.put("/illegal/:id", protect, uploadMiddleware.single("photo"), illegalController.updateIllegal);
router.delete("/illegal/:id", protect, illegalController.deleteIllegal);

// ระบบ Excel อัปโหลดและตรวจสอบ Progress
// 🟢 ใส่ protect เข้าไปที่ระบบอัปโหลด Excel
router.post("/upload-excel-illegal", protect, uploadExcel.single("file"), illegalController.uploadExcelIllegal);
router.get("/upload-progress/:jobId", illegalController.getUploadProgress);

// ----------------------------------------------------
// Deported (ส่งกลับ)
// ----------------------------------------------------
router.get("/deported/:id", deportedController.getDeportedById);
router.post("/deported", protect, uploadMiddleware.single("photo"), deportedController.createDeported);
router.put("/deported/:id", protect, uploadMiddleware.single("photo"), deportedController.updateDeported);
router.delete("/deported/:id", protect, deportedController.deleteDeported);

module.exports = router;