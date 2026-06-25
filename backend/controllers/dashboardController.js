// backend/controllers/dashboardController.js
const pool = require("../config/db");

// ฟังก์ชันแปลงปี พ.ศ. เป็น ค.ศ. อัตโนมัติ กรณีพิมพ์ปี 25xx เข้ามา
const convertBEtoAD = (dateStr) => {
    if (!dateStr || String(dateStr).trim() === "") return null;
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
        let year = parseInt(parts[0], 10);
        if (year > 2400) {
            year -= 543;
            return `${year}-${parts[1]}-${parts[2]}`;
        }
    }
    return dateStr;
};

exports.getDashboardStats = async (req, res) => {
  try {
    const { 
      type = "illegal", 
      nationality = "ทั้งหมด", 
      gender = "ทั้งหมด", 
      startDate: rawStartDate, 
      endDate: rawEndDate,
      dobStart: rawDobStart, 
      dobEnd: rawDobEnd,   
      isVictim = "ทั้งหมด",
      hasPassport = "ทั้งหมด",
      creator = "ทั้งหมด", // ฟิลเตอร์ชื่อผู้เพิ่มข้อมูล
      page = 1,
      limit = 50,
      sortBy,             
      sortOrder = "asc"   
    } = req.query;

    const startDate = convertBEtoAD(rawStartDate);
    const endDate = convertBEtoAD(rawEndDate);
    const dobStart = convertBEtoAD(rawDobStart);
    const dobEnd = convertBEtoAD(rawDobEnd);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const vStart = !!startDate;
    const vEnd = !!endDate;
    const vDobStart = !!dobStart;
    const vDobEnd = !!dobEnd;

    let tableName = type === "deported" ? "deported_persons" : "illegal_immigrants";
    let dateField = type === "deported" ? "return_date" : "detected_date";

    let conditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // WHERE clause สำหรับวันที่
    if (vStart && vEnd) {
      conditions.push(`DATE(t.${dateField}) >= $${paramIndex} AND DATE(t.${dateField}) <= $${paramIndex + 1}`);
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    } else if (vStart) {
      conditions.push(`DATE(t.${dateField}) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    } else if (vEnd) {
      conditions.push(`DATE(t.${dateField}) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (type === "deported") {
      if (vDobStart && vDobEnd) {
        conditions.push(`DATE(t.date_of_birth) >= $${paramIndex} AND DATE(t.date_of_birth) <= $${paramIndex + 1}`);
        queryParams.push(dobStart, dobEnd);
        paramIndex += 2;
      } else if (vDobStart) {
        conditions.push(`DATE(t.date_of_birth) >= $${paramIndex}`);
        queryParams.push(dobStart);
        paramIndex++;
      } else if (vDobEnd) {
        conditions.push(`DATE(t.date_of_birth) <= $${paramIndex}`);
        queryParams.push(dobEnd);
        paramIndex++;
      }
    }

    if (type === "illegal" && nationality && nationality !== "ทั้งหมด") {
      conditions.push(`t.nationality = $${paramIndex}`);
      queryParams.push(nationality);
      paramIndex++;
    }
    if (gender && gender !== "ทั้งหมด") {
      conditions.push(`t.gender = $${paramIndex}`);
      queryParams.push(gender);
      paramIndex++;
    }

    if (type === "illegal") {
      if (isVictim === "true" || isVictim === "false") {
        conditions.push(`t.is_victim = $${paramIndex}`);
        queryParams.push(isVictim === "true");
        paramIndex++;
      }
      if (hasPassport === "true") {
        conditions.push(`t.passport_id IS NOT NULL AND t.passport_id ~ '\\S' AND LOWER(TRIM(t.passport_id)) NOT IN ('-', 'ไม่มี', 'ไม่ระบุ', 'none', 'n/a', 'null', 'ไม่มีหนังสือเดินทาง')`);
      } else if (hasPassport === "false") {
        conditions.push(`(t.passport_id IS NULL OR TRIM(t.passport_id) = '' OR LOWER(TRIM(t.passport_id)) IN ('-', 'ไม่มี', 'ไม่ระบุ', 'none', 'n/a', 'null', 'ไม่มีหนังสือเดินทาง'))`);
      }
    }

    // ฟิลเตอร์ผู้เพิ่มข้อมูล (เชื่อมกับตาราง users)
    if (creator && creator !== "ทั้งหมด") {
      conditions.push(`u.name = $${paramIndex}`);
      queryParams.push(creator);
      paramIndex++;
    }

    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderClause = `ORDER BY t.${dateField} DESC NULLS LAST, t.id DESC`; 
    if (sortBy) {
      const dir = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
      if (sortBy === "name") {
          orderClause = `ORDER BY t.first_name_th ${dir} NULLS LAST, t.last_name_th ${dir} NULLS LAST, t.id DESC`;
      } else if (sortBy === "creator") {
          orderClause = `ORDER BY u.name ${dir} NULLS LAST, t.id DESC`;
      } else {
          const allowedColumns = ["nationality", "detected_date", "detected_location", "is_victim", "date_of_birth", "national_id", "address", "return_date", "result", "channel"];
          if (allowedColumns.includes(sortBy)) {
              orderClause = `ORDER BY t.${sortBy} ${dir} NULLS LAST, t.id DESC`;
          }
      }
    }

    // Query เพื่อดึงข้อมูล Table พร้อม Join ตาราง users เพื่อเอาชื่อคนเพิ่ม
    const dataQuery = `
      SELECT t.*, u.name as creator_name 
      FROM ${tableName} t 
      LEFT JOIN users u ON t.created_by = u.id 
      ${whereClause} 
      ${orderClause} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const tableData = await pool.query(dataQuery, [...queryParams, limitNum, offset]);

    // Query นับจำนวนข้อมูลทั้งหมด
    const totalCountQuery = `
      SELECT COUNT(*) 
      FROM ${tableName} t 
      LEFT JOIN users u ON t.created_by = u.id 
      ${whereClause}
    `;
    const totalCountResult = await pool.query(totalCountQuery, queryParams);
    const totalItems = parseInt(totalCountResult.rows[0].count);

    let baseWhere = whereClause;
    let baseParams = queryParams;

    let stats = { total: totalItems };
    let charts = {};

    if (type === "illegal") {
      const victimCountQuery = `SELECT COUNT(*) FROM illegal_immigrants t LEFT JOIN users u ON t.created_by = u.id ${baseWhere ? baseWhere + " AND " : "WHERE "} t.is_victim = true`;
      const victimRes = await pool.query(victimCountQuery, baseParams);
      
      const passportValidCond = `t.passport_id IS NOT NULL AND t.passport_id ~ '\\S' AND LOWER(TRIM(t.passport_id)) NOT IN ('-', 'ไม่มี', 'ไม่ระบุ', 'none', 'n/a', 'null', 'ไม่มีหนังสือเดินทาง')`;
      const passportCountQuery = `SELECT COUNT(*) FROM illegal_immigrants t LEFT JOIN users u ON t.created_by = u.id ${baseWhere ? baseWhere + " AND " : "WHERE "} ${passportValidCond}`;
      const passportRes = await pool.query(passportCountQuery, baseParams);

      const natChartQuery = `SELECT COALESCE(t.nationality, 'ไม่ระบุ') as name, COUNT(*) as value FROM illegal_immigrants t LEFT JOIN users u ON t.created_by = u.id ${baseWhere} GROUP BY 1 ORDER BY value DESC LIMIT 6`;
      const natChartRes = await pool.query(natChartQuery, baseParams);

      const victimChartQuery = `SELECT CASE WHEN t.is_victim = true THEN 'เป็นผู้เสียหาย' ELSE 'ไม่เป็นผู้เสียหาย' END as name, COUNT(*) as value FROM illegal_immigrants t LEFT JOIN users u ON t.created_by = u.id ${baseWhere} GROUP BY 1 ORDER BY value DESC`;
      const victimChartRes = await pool.query(victimChartQuery, baseParams);

      const passportChartQuery = `SELECT CASE WHEN ${passportValidCond} THEN 'มีหนังสือเดินทาง' ELSE 'ไม่มีข้อมูล / ไม่มี' END as name, COUNT(*) as value FROM illegal_immigrants t LEFT JOIN users u ON t.created_by = u.id ${baseWhere} GROUP BY 1 ORDER BY value DESC`;
      const passportChartRes = await pool.query(passportChartQuery, baseParams);

      stats.victims = parseInt(victimRes.rows[0].count);
      stats.hasPassport = parseInt(passportRes.rows[0].count);
      charts.nationality = natChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));
      charts.victim = victimChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));
      charts.passport = passportChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));
    } else {
      const successCountQuery = `SELECT COUNT(*) FROM deported_persons t LEFT JOIN users u ON t.created_by = u.id ${baseWhere ? baseWhere + " AND " : "WHERE "} t.result = 'SUCCESS'`;
      const successRes = await pool.query(successCountQuery, baseParams);

      const channelChartQuery = `SELECT COALESCE(t.channel, 'ไม่ระบุช่องทาง') as name, COUNT(*) as value FROM deported_persons t LEFT JOIN users u ON t.created_by = u.id ${baseWhere} GROUP BY 1 ORDER BY value DESC`;
      const channelChartRes = await pool.query(channelChartQuery, baseParams);

      stats.success = parseInt(successRes.rows[0].count);
      charts.channel = channelChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));
    }

    // ✨ ปรับปรุง: กราฟสรุปผู้เพิ่มข้อมูล (Creator Chart) ให้ดึงค่า u.color ประจำตัวของ User ออกมาจาก Database ด้วย
    const creatorChartQuery = `
      SELECT 
        COALESCE(u.name, 'ไม่ทราบผู้เพิ่ม') as name, 
        u.color as color, 
        COUNT(*) as value 
      FROM ${tableName} t 
      LEFT JOIN users u ON t.created_by = u.id 
      ${baseWhere} 
      GROUP BY u.name, u.color 
      ORDER BY value DESC 
      LIMIT 10
    `;
    const creatorChartRes = await pool.query(creatorChartQuery, baseParams);
    charts.creator = creatorChartRes.rows.map(r => ({ 
      name: r.name, 
      value: parseInt(r.value),
      color: r.color 
    }));

    let allNatsRes = { rows: [] };
    if (type === "illegal") {
      allNatsRes = await pool.query(`SELECT DISTINCT COALESCE(t.nationality, 'ไม่ระบุ') as nat FROM illegal_immigrants t WHERE t.nationality IS NOT NULL AND t.nationality != '' ORDER BY nat`);
    }

    const allGendersRes = await pool.query(`SELECT DISTINCT COALESCE(t.gender, 'ไม่ระบุ') as gen FROM ${tableName} t WHERE t.gender IS NOT NULL AND t.gender != '' ORDER BY gen`);
    
    // ดึงรายชื่อผู้เพิ่มข้อมูลทั้งหมดไปโชว์ใน Dropdown Filter
    const allCreatorsRes = await pool.query(`SELECT DISTINCT u.name as creator FROM ${tableName} t JOIN users u ON t.created_by = u.id WHERE u.name IS NOT NULL ORDER BY u.name`);

    res.status(200).json({
      success: true,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
        currentPage: pageNum,
        allNationalities: type === "illegal" ? ["ทั้งหมด", ...allNatsRes.rows.map(r => r.nat)] : ["ทั้งหมด"],
        allGenders: ["ทั้งหมด", ...allGendersRes.rows.map(r => r.gen)],
        allCreators: ["ทั้งหมด", ...allCreatorsRes.rows.map(r => r.creator)]
      },
      stats,
      charts,
      tableData: tableData.rows
    });

  } catch (err) {
    console.error("Dashboard Stats Error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};