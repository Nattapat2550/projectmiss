const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const isLocalhost = !connectionString || connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString: connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
  // ⚡ เพิ่มเพื่อประสิทธิภาพการดึงและอัพโหลดข้อมูลที่ไวที่สุด
  max: 25,                 // จำนวน Client สูงสุดใน Pool
  idleTimeoutMillis: 30000, // ปิด Connection ที่ไม่ได้ใช้งานภายใน 30 วินาที
  connectionTimeoutMillis: 10000, // Timeout ถ้าต่อฐานข้อมูลไม่ได้ภายใน 10 วินาที (ช่วยให้เซิร์ฟเวอร์ตอบกลับไวขึ้นเมื่อมีปัญหา)
});

pool.connect()
  .then((client) => {
    console.log("✅ PostgreSQL Connected Successfully & Pool Optimized");
    client.release();
  })
  .catch((err) => {
    console.error("❌ PostgreSQL Connection error:", err.message);
  });

module.exports = pool;