const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit"); // 🟢 นำเข้า Rate Limit
const testUpload2Controller = require("../controllers/testUpload2Controller");
const { protect } = require("../middleware/auth");

const upload = multer({ dest: "uploads/" });

// 🟢 สร้างตัวกันสแปม: ให้ยิงได้ไม่เกิน 10 ครั้งต่อ 15 นาที
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 10, // จำกัด 10 ครั้งต่อ IP
  message: { success: false, message: "อัปโหลดบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" }
});

// 🟢 ใส่ uploadLimiter ขวางไว้ก่อนเข้า protect
router.post("/upload-excel", uploadLimiter, protect, upload.single("file"), testUpload2Controller.uploadExcel);

router.get("/upload-progress/:jobId", testUpload2Controller.getUploadProgress);

module.exports = router;