const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");

const authRoutes = require("./routes/auth"); // นำเข้า Auth Route
const missingRoutes = require('./routes/missing');
const dashboardRoutes = require("./routes/dashboard");

const app = express();
app.disable('x-powered-by');
app.use(helmet());
// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// เสิร์ฟไฟล์รูปภาพ/ไฟล์แนบแบบ Public
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🟢 เพิ่ม Route หน้าแรก (Root) เอาไว้ตอบกลับ ServerAwaker โดยเฉพาะ
app.get("/", (req, res) => {
  res.status(200).send("Backend is awake!");
});

// 📌 Routes: ปรับปรุงให้มี /api/v1/ นำหน้าทุกจุดให้ตรงกับหน้าบ้าน
app.use("/api/v1/auth", authRoutes);
app.use('/api/v1/missing-persons', missingRoutes);
app.use('/api/v1/missing', missingRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
// ⚠️ ดักจับกรณีเรียก Route ที่ไม่มีอยู่จริง (404 handler)
// เปลี่ยนจากการส่งหน้า HTML เป็นการส่ง JSON เพื่อไม่ให้ Frontend แครช
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `ไม่พบเส้นทาง API: ${req.method} ${req.originalUrl}`
  });
});

module.exports = app;