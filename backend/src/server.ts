import dotenv from "dotenv";

import path from "path";

// 1. โหลด config.env ก่อนที่จะ require ไฟล์อื่นๆ ที่ต้องใช้ process.env
dotenv.config({ path: path.join(__dirname, 'config/config.env') });

// 2. นำเข้าไฟล์ db.js
import pool from "./config/db";

import app from "./app";

const PORT = parseInt(process.env.PORT as string, 10) || 8000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// จัดการ Error ที่ไม่ได้ Handle ป้องกันเซิร์ฟเวอร์ดับกะทันหัน
process.on("unhandledRejection", (err: Error, promise) => {
  console.log(`Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});