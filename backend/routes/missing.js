const express = require("express");
const router = express.Router();
const multer = require("multer");
const missingController = require("../controllers/missingController");
const { protect } = require("../middleware/auth");

// 🟢 เปลี่ยนเป็นใช้ MemoryStorage เพื่อให้ Controller สามารถอ่าน req.file.buffer ได้
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/upload", protect, upload.single("file"), missingController.uploadMissingExcel);
router.get("/upload-progress/:jobId", missingController.getUploadProgress);

module.exports = router;