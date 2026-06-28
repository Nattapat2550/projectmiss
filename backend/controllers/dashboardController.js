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
      nationality = "ทั้งหมด", 
      gender = "ทั้งหมด", 
      startDate: rawStartDate, 
      endDate: rawEndDate,
      page = 1,
      limit = 50,
      sortBy,             
      sortOrder = "asc"   
    } = req.query;

    const startDate = convertBEtoAD(rawStartDate);
    const endDate = convertBEtoAD(rawEndDate);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    const vStart = !!startDate;
    const vEnd = !!endDate;

    let conditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // WHERE clause สำหรับวันที่รับแจ้ง (reported_date) ในตาราง cases
    if (vStart && vEnd) {
      conditions.push(`DATE(c.reported_date) >= $${paramIndex} AND DATE(c.reported_date) <= $${paramIndex + 1}`);
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    } else if (vStart) {
      conditions.push(`DATE(c.reported_date) >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    } else if (vEnd) {
      conditions.push(`DATE(c.reported_date) <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    if (nationality && nationality !== "ทั้งหมด") {
      conditions.push(`mp.nationality = $${paramIndex}`);
      queryParams.push(nationality);
      paramIndex++;
    }
    if (gender && gender !== "ทั้งหมด") {
      conditions.push(`mp.gender = $${paramIndex}`);
      queryParams.push(gender);
      paramIndex++;
    }

    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderClause = `ORDER BY c.reported_date DESC NULLS LAST, c.case_id DESC`; 
    if (sortBy) {
      const dir = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
      if (sortBy === "name") {
          orderClause = `ORDER BY mp.missing_person_name ${dir} NULLS LAST, c.case_id DESC`;
      } else if (sortBy === "reported_date") {
          orderClause = `ORDER BY c.reported_date ${dir} NULLS LAST, c.case_id DESC`;
      } else if (sortBy === "nationality") {
          orderClause = `ORDER BY mp.nationality ${dir} NULLS LAST, c.case_id DESC`;
      }
    }

    // Query ดึงข้อมูลตารางหลัก (missing_persons JOIN cases JOIN informants JOIN agencies)
    const dataQuery = `
      SELECT 
        mp.missing_person_id,
        mp.missing_person_name as first_name_th, -- แกล้ง map ให้เข้ากับคอมโพเนนต์เก่า
        '' as last_name_th,
        mp.age,
        mp.gender,
        mp.nationality,
        c.reported_date as detected_date,
        c.found_date as return_date,
        c.police_station as address,
        c.case_number as national_id,
        c.photo_url as passport_id,
        c.operation_result as result
      FROM missing_persons mp 
      LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
      ${whereClause} 
      ${orderClause} 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const tableData = await pool.query(dataQuery, [...queryParams, limitNum, offset]);

    // Query นับจำนวน
    const totalCountQuery = `
      SELECT COUNT(*) 
      FROM missing_persons mp
      LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
      ${whereClause}
    `;
    const totalCountResult = await pool.query(totalCountQuery, queryParams);
    const totalItems = parseInt(totalCountResult.rows[0].count);

    let baseWhere = whereClause;
    let baseParams = queryParams;

    let stats = { total: totalItems };
    let charts = {};

    // นับจำนวนที่พบตัวแล้ว
    const foundQuery = `SELECT COUNT(*) FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere ? baseWhere + " AND " : "WHERE "} c.found_date IS NOT NULL`;
    const foundRes = await pool.query(foundQuery, baseParams);
    stats.found = parseInt(foundRes.rows[0].count);

    // กราฟสัญชาติ
    const natChartQuery = `SELECT COALESCE(mp.nationality, 'ไม่ระบุ') as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere} GROUP BY 1 ORDER BY value DESC LIMIT 6`;
    const natChartRes = await pool.query(natChartQuery, baseParams);
    charts.nationality = natChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟเพศ
    const genderChartQuery = `SELECT COALESCE(mp.gender, 'ไม่ระบุ') as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere} GROUP BY 1 ORDER BY value DESC`;
    const genderChartRes = await pool.query(genderChartQuery, baseParams);
    charts.gender = genderChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    let allNatsRes = await pool.query(`SELECT DISTINCT COALESCE(nationality, 'ไม่ระบุ') as nat FROM missing_persons WHERE nationality IS NOT NULL AND nationality != '' ORDER BY nat`);
    const allGendersRes = await pool.query(`SELECT DISTINCT COALESCE(gender, 'ไม่ระบุ') as gen FROM missing_persons WHERE gender IS NOT NULL AND gender != '' ORDER BY gen`);
    
    res.status(200).json({
      success: true,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
        currentPage: pageNum,
        allNationalities: ["ทั้งหมด", ...allNatsRes.rows.map(r => r.nat)],
        allGenders: ["ทั้งหมด", ...allGendersRes.rows.map(r => r.gen)],
        allCreators: ["ทั้งหมด"] // ปลอมไว้ก่อน
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