const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const isLocalhost = !connectionString || connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const pool = new Pool({
  connectionString: connectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
  // ⚡ เพิ่มเพื่อประสิทธิภาพการดึงและอัพโหลดข้อมูลที่ไวที่สุด
  max: 25,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 60000, // เพิ่มเป็น 60 วินาที เพื่อเผื่อเวลาให้ฐานข้อมูลแบบ Free Tier ของ Render ตื่น
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