const dotenv = require("dotenv");

// 1. โหลด config.env ก่อนที่จะ require ไฟล์อื่นๆ ที่ต้องใช้ process.env
dotenv.config({ path: "./config/config.env" });

// 2. นำเข้าไฟล์ db.js
const pool = require("./config/db");

const app = require("./app");

const PORT = process.env.PORT || 8000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// จัดการ Error ที่ไม่ได้ Handle ป้องกันเซิร์ฟเวอร์ดับกะทันหัน
process.on("unhandledRejection", (err, promise) => {
  console.log(`Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});