// backend/controllers/immigrantController.js หรือ immigrantsController.js

const pool = require("../config/db");
const dashboardService = require("../services/dashboardService"); 

exports.getAllData = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    // ทำการ LEFT JOIN กับตาราง users เพื่อเอาชื่อคนอัพโหลด (creator_name) และสี (creator_color) ออกมาแสดงในตารางข้อมูลทั้งหมดด้วย
    const [immigrantsRes, immigrantsCountRes, deportedsRes, deportedsCountRes] = await Promise.all([
      pool.query(`
        SELECT t.*, u.name AS creator_name, u.color AS creator_color 
        FROM illegal_immigrants t 
        LEFT JOIN users u ON t.created_by = u.id 
        ORDER BY t.detected_date DESC NULLS LAST 
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query("SELECT COUNT(*) FROM illegal_immigrants"),
      pool.query(`
        SELECT t.*, u.name AS creator_name, u.color AS creator_color 
        FROM deported_persons t 
        LEFT JOIN users u ON t.created_by = u.id 
        ORDER BY t.return_date DESC NULLS LAST 
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      pool.query("SELECT COUNT(*) FROM deported_persons")
    ]);

    res.status(200).json({ 
      success: true, 
      data: { 
        // ใช้คีย์ immigrants ตามที่กำหนด (และใส่คีย์เดิมสำรองไว้เพื่อความปลอดภัยของระบบ)
        immigrants: immigrantsRes.rows, 
        illegals: immigrantsRes.rows, 
        deporteds: deportedsRes.rows,
        meta: { 
          immigrantsTotal: parseInt(immigrantsCountRes.rows[0].count), 
          illegalsTotal: parseInt(immigrantsCountRes.rows[0].count), 
          deportedsTotal: parseInt(deportedsCountRes.rows[0].count), 
          currentPage: page, 
          limit: limit 
        }
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getDashboardData = async (req, res) => {
  try {
    // รองรับการส่งไทป์มาเป็น 'immigrants' หรือ 'illegal'
    let type = req.query.type || "deported";
    if (type === "immigrants" || type === "immigrant" || type === "illegal") {
      type = "illegal"; // แมปภายในเข้ากับเงื่อนไขของ service และฐานข้อมูลตัวเดิม
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // 🟢 สร้าง SQL Query จาก Service
    const { whereClause, params, orderClause } = dashboardService.buildDashboardQuerySQL(req.query, type);
    const tableName = type === "deported" ? "deported_persons" : "illegal_immigrants";
    const paramCount = params.length;

    // ปรับ Query หลักให้ทำการ LEFT JOIN ดึงข้อมูลรายละเอียดบัญชีผู้ใช้ (ชื่อและสี) ของผู้อัพโหลดข้อมูลรายการนั้นๆ
    const dataQuery = `
      SELECT t.*, u.name AS creator_name, u.color AS creator_color 
      FROM ${tableName} t 
      LEFT JOIN users u ON t.created_by = u.id 
      ${whereClause} ${orderClause} 
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    const countQuery = `
      SELECT COUNT(t.id) 
      FROM ${tableName} t 
      LEFT JOIN users u ON t.created_by = u.id
      ${whereClause}
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, [...params, limit, offset]),
      pool.query(countQuery, params)
    ]);

    const totalItems = parseInt(countRes.rows[0].count);

    res.status(200).json({ 
      success: true, 
      tableData: dataRes.rows, 
      meta: { 
        totalItems, 
        totalPages: Math.ceil(totalItems / limit) || 1, 
        currentPage: page, 
        limit: limit 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error", error: err.message });
  }
};