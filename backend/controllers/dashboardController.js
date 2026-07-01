// backend/controllers/dashboardController.js
const pool = require("../config/db");
const cache = require("../utils/cache");

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
      province = "ทั้งหมด",
      ageGroup = "ทั้งหมด",
      human_trafficking = "ทั้งหมด",
      status = "ทั้งหมด",
      page = 1,
      limit = 50,
      sortBy,             
      sortOrder = "asc"   
    } = req.query;

    const cacheKey = `dashboard_${JSON.stringify(req.query)}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
        return res.status(200).json(cachedData);
    }

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
      if (nationality === "ไม่ระบุ") {
        conditions.push(`(mp.nationality IS NULL OR TRIM(mp.nationality) = '' OR mp.nationality = 'ไม่ระบุ')`);
      } else {
        conditions.push(`mp.nationality = $${paramIndex}`);
        queryParams.push(nationality);
        paramIndex++;
      }
    }
    if (gender && gender !== "ทั้งหมด") {
      if (gender === "ไม่ระบุ") {
        conditions.push(`(mp.gender IS NULL OR TRIM(mp.gender) = '' OR mp.gender = 'ไม่ระบุ')`);
      } else {
        conditions.push(`mp.gender = $${paramIndex}`);
        queryParams.push(gender);
        paramIndex++;
      }
    }

    
    if (province && province !== "ทั้งหมด") {
      if (province === "ไม่ระบุ") {
        conditions.push(`(c.detected_location_province IS NULL OR TRIM(c.detected_location_province) = '' OR c.detected_location_province = 'ไม่ระบุ')`);
      } else {
        conditions.push(`c.detected_location_province = ${paramIndex}`);
        queryParams.push(province);
        paramIndex++;
      }
    }
    if (ageGroup && ageGroup !== "ทั้งหมด") {
      if (ageGroup === "0-18 ปี") {
        conditions.push(`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) <= 18`);
      } else if (ageGroup === "19-30 ปี") {
        conditions.push(`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 19 AND 30`);
      } else if (ageGroup === "31-50 ปี") {
        conditions.push(`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 31 AND 50`);
      } else if (ageGroup === "51 ปีขึ้นไป") {
        conditions.push(`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) >= 51`);
      } else if (ageGroup === "ไม่ระบุ") {
        conditions.push(`mp.date_of_birth IS NULL`);
      }
    }
    if (human_trafficking && human_trafficking !== "ทั้งหมด") {
      if (human_trafficking === "มีข้อบ่งชี้") {
        conditions.push(`c.human_trafficking_indicators = true`);
      } else if (human_trafficking === "ไม่มีข้อบ่งชี้") {
        conditions.push(`(c.human_trafficking_indicators = false OR c.human_trafficking_indicators IS NULL)`);
      }
    }
    if (status && status !== "ทั้งหมด") {
      if (status === "พบตัวแล้ว") {
        conditions.push(`(c.found_date IS NOT NULL OR c.operation_result = true)`);
      } else if (status === "ยังไม่พบตัว") {
        conditions.push(`(c.found_date IS NULL AND (c.operation_result = false OR c.operation_result IS NULL))`);
      }
    }

    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderClause = `ORDER BY c.reported_date DESC NULLS LAST, c.case_id DESC`; 
    if (sortBy) {
      const field = String(sortBy).trim();
      const dir = String(sortOrder).trim().toLowerCase() === "asc" ? "ASC" : "DESC";
      let sortExpr = null;
      switch (field) {
          case "name": sortExpr = `COALESCE(NULLIF(NULLIF(TRIM(mp.first_name_th), ''), 'ไม่ระบุ'), NULLIF(NULLIF(TRIM(mp.first_name_en), ''), 'ไม่ระบุ')) ${dir} NULLS LAST`; break;
          case "nationality": sortExpr = `NULLIF(TRIM(mp.nationality), '') ${dir} NULLS LAST`; break;
          case "age": sortExpr = `mp.date_of_birth ${dir === 'ASC' ? 'DESC' : 'ASC'} NULLS LAST`; break;
          case "gender": sortExpr = `NULLIF(TRIM(mp.gender), '') ${dir} NULLS LAST`; break;
          case "missing_location": sortExpr = `NULLIF(TRIM(c.detected_location_province), '') ${dir} NULLS LAST`; break;
          case "missing_date": sortExpr = `c.missing_date ${dir} NULLS LAST`; break;
          case "reported_date": sortExpr = `c.reported_date ${dir} NULLS LAST`; break;
          case "human_trafficking": sortExpr = `c.human_trafficking_indicators ${dir} NULLS LAST`; break;
          case "status": sortExpr = `(CASE WHEN c.found_date IS NOT NULL OR c.operation_result = true THEN 0 ELSE 1 END) ${dir}`; break;
      }
      if (sortExpr) {
          orderClause = `ORDER BY ${sortExpr}, c.case_id DESC`;
      }
    }

    // Query ดึงข้อมูลตารางหลัก (missing_persons JOIN cases JOIN informants JOIN agencies)
    const dataQuery = `
      SELECT 
        mp.missing_person_id,
        mp.first_name_th,
        mp.last_name_th,
        mp.first_name_en,
        mp.last_name_en,
        mp.date_of_birth,
        EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) as age,
        mp.gender,
        mp.nationality,
        mp.missing_id_card_passport,
        mp.passport_number,
        c.case_id,
        c.police_station,
        c.incident_summary,
        c.human_trafficking_indicators,
        c.detected_location_province as address,
        c.detected_location_details,
        c.missing_date as detected_date,
        c.found_date as return_date,
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
    const foundQuery = `SELECT COUNT(*) FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere ? baseWhere + " AND " : "WHERE "} (c.found_date IS NOT NULL OR c.operation_result = true)`;
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

    
    // กราฟจังหวัด
    const provinceChartQuery = `SELECT COALESCE(NULLIF(TRIM(c.detected_location_province), ''), 'ไม่ระบุ') as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere} GROUP BY 1 ORDER BY value DESC LIMIT 6`;
    const provinceChartRes = await pool.query(provinceChartQuery, baseParams);
    charts.province = provinceChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟช่วงอายุ
    const ageChartQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) <= 18 THEN '0-18 ปี'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 19 AND 30 THEN '19-30 ปี'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 31 AND 50 THEN '31-50 ปี'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) >= 51 THEN '51 ปีขึ้นไป'
          ELSE 'ไม่ระบุ'
        END as name, COUNT(*) as value
      FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere} GROUP BY 1 ORDER BY value DESC
    `;
    const ageChartRes = await pool.query(ageChartQuery, baseParams);
    charts.ageGroup = ageChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟวันที่รับแจ้งความ (รายเดือน 12 เดือนล่าสุด)
    const reportedDateChartQuery = `
      SELECT TO_CHAR(DATE_TRUNC('month', c.reported_date), 'Mon YYYY') as name, COUNT(*) as value
      FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
      ${baseWhere ? baseWhere + " AND " : "WHERE "} c.reported_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', c.reported_date), TO_CHAR(DATE_TRUNC('month', c.reported_date), 'Mon YYYY')
      ORDER BY DATE_TRUNC('month', c.reported_date) ASC
      LIMIT 12
    `;
    const reportedDateChartRes = await pool.query(reportedDateChartQuery, baseParams);
    charts.reportedDateTrend = reportedDateChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟข้อบ่งชี้การค้ามนุษย์
    const htChartQuery = `SELECT CASE WHEN c.human_trafficking_indicators = true THEN 'มีข้อบ่งชี้' ELSE 'ไม่มีข้อบ่งชี้' END as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere} GROUP BY 1 ORDER BY value DESC`;
    const htChartRes = await pool.query(htChartQuery, baseParams);
    charts.humanTrafficking = htChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟสถานะการพบตัว
    const statusChartQuery = `SELECT CASE WHEN c.found_date IS NOT NULL OR c.operation_result = true THEN 'พบตัวแล้ว' ELSE 'ยังไม่พบตัว' END as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id ${baseWhere} GROUP BY 1 ORDER BY value DESC`;
    const statusChartRes = await pool.query(statusChartQuery, baseParams);
    charts.status = statusChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    let allNatsRes = await pool.query(`SELECT DISTINCT COALESCE(NULLIF(TRIM(nationality), ''), 'ไม่ระบุ') as nat FROM missing_persons ORDER BY nat`);
    const allGendersRes = await pool.query(`SELECT DISTINCT COALESCE(NULLIF(TRIM(gender), ''), 'ไม่ระบุ') as gen FROM missing_persons ORDER BY gen`);
    const allProvincesRes = await pool.query(`SELECT DISTINCT COALESCE(NULLIF(TRIM(detected_location_province), ''), 'ไม่ระบุ') as prov FROM cases ORDER BY prov`);
    
    const responseData = {
      success: true,
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
        currentPage: pageNum,
        allNationalities: ["ทั้งหมด", ...allNatsRes.rows.map(r => r.nat)],
        allGenders: ["ทั้งหมด", ...allGendersRes.rows.map(r => r.gen)],
        allProvinces: ["ทั้งหมด", ...allProvincesRes.rows.map(r => r.prov)],
        allCreators: ["ทั้งหมด"] // ปลอมไว้ก่อน
      },
      stats,
      charts,
      tableData: tableData.rows
    };

    cache.set(cacheKey, responseData);

    res.status(200).json(responseData);

  } catch (err) {
    console.error("Dashboard Stats Error:", err.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};