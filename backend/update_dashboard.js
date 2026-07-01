const fs = require('fs');
let code = fs.readFileSync('controllers/dashboardController.js', 'utf8');

// 1. Add new query parameters
code = code.replace(
  /endDate: rawEndDate,/g,
  'endDate: rawEndDate,\n      province = "ทั้งหมด",\n      ageGroup = "ทั้งหมด",\n      human_trafficking = "ทั้งหมด",\n      status = "ทั้งหมด",'
);

// 2. Add WHERE conditions
const whereInsert = `
    if (province && province !== "ทั้งหมด") {
      if (province === "ไม่ระบุ") {
        conditions.push(\`(c.detected_location_province IS NULL OR TRIM(c.detected_location_province) = '' OR c.detected_location_province = 'ไม่ระบุ')\`);
      } else {
        conditions.push(\`c.detected_location_province = $\${paramIndex}\`);
        queryParams.push(province);
        paramIndex++;
      }
    }
    if (ageGroup && ageGroup !== "ทั้งหมด") {
      if (ageGroup === "0-18 ปี") {
        conditions.push(\`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) <= 18\`);
      } else if (ageGroup === "19-30 ปี") {
        conditions.push(\`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 19 AND 30\`);
      } else if (ageGroup === "31-50 ปี") {
        conditions.push(\`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 31 AND 50\`);
      } else if (ageGroup === "51 ปีขึ้นไป") {
        conditions.push(\`EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) >= 51\`);
      } else if (ageGroup === "ไม่ระบุ") {
        conditions.push(\`mp.date_of_birth IS NULL\`);
      }
    }
    if (human_trafficking && human_trafficking !== "ทั้งหมด") {
      if (human_trafficking === "มีข้อบ่งชี้") {
        conditions.push(\`c.human_trafficking_indicators = true\`);
      } else if (human_trafficking === "ไม่มีข้อบ่งชี้") {
        conditions.push(\`(c.human_trafficking_indicators = false OR c.human_trafficking_indicators IS NULL)\`);
      }
    }
    if (status && status !== "ทั้งหมด") {
      if (status === "พบตัวแล้ว") {
        conditions.push(\`(c.found_date IS NOT NULL OR c.operation_result = true)\`);
      } else if (status === "ยังไม่พบตัว") {
        conditions.push(\`(c.found_date IS NULL AND (c.operation_result = false OR c.operation_result IS NULL))\`);
      }
    }
`;
code = code.replace(
  /let whereClause = conditions\.length > 0 \? \`WHERE \$\{conditions\.join\(\" AND \"\)\}\` : \"\";/g,
  whereInsert + '\n    let whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";'
);

// 3. Add charts
const chartInsert = `
    // กราฟจังหวัด
    const provinceChartQuery = \`SELECT COALESCE(NULLIF(TRIM(c.detected_location_province), ''), 'ไม่ระบุ') as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id \${baseWhere} GROUP BY 1 ORDER BY value DESC LIMIT 6\`;
    const provinceChartRes = await pool.query(provinceChartQuery, baseParams);
    charts.province = provinceChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟช่วงอายุ
    const ageChartQuery = \`
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) <= 18 THEN '0-18 ปี'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 19 AND 30 THEN '19-30 ปี'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) BETWEEN 31 AND 50 THEN '31-50 ปี'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) >= 51 THEN '51 ปีขึ้นไป'
          ELSE 'ไม่ระบุ'
        END as name, COUNT(*) as value
      FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id \${baseWhere} GROUP BY 1 ORDER BY value DESC
    \`;
    const ageChartRes = await pool.query(ageChartQuery, baseParams);
    charts.ageGroup = ageChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟวันที่รับแจ้งความ (รายเดือน 12 เดือนล่าสุด)
    const reportedDateChartQuery = \`
      SELECT TO_CHAR(DATE_TRUNC('month', c.reported_date), 'Mon YYYY') as name, COUNT(*) as value
      FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
      \${baseWhere ? baseWhere + " AND " : "WHERE "} c.reported_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', c.reported_date), TO_CHAR(DATE_TRUNC('month', c.reported_date), 'Mon YYYY')
      ORDER BY DATE_TRUNC('month', c.reported_date) ASC
      LIMIT 12
    \`;
    const reportedDateChartRes = await pool.query(reportedDateChartQuery, baseParams);
    charts.reportedDateTrend = reportedDateChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟข้อบ่งชี้การค้ามนุษย์
    const htChartQuery = \`SELECT CASE WHEN c.human_trafficking_indicators = true THEN 'มีข้อบ่งชี้' ELSE 'ไม่มีข้อบ่งชี้' END as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id \${baseWhere} GROUP BY 1 ORDER BY value DESC\`;
    const htChartRes = await pool.query(htChartQuery, baseParams);
    charts.humanTrafficking = htChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));

    // กราฟสถานะการพบตัว
    const statusChartQuery = \`SELECT CASE WHEN c.found_date IS NOT NULL OR c.operation_result = true THEN 'พบตัวแล้ว' ELSE 'ยังไม่พบตัว' END as name, COUNT(*) as value FROM missing_persons mp LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id \${baseWhere} GROUP BY 1 ORDER BY value DESC\`;
    const statusChartRes = await pool.query(statusChartQuery, baseParams);
    charts.status = statusChartRes.rows.map(r => ({ name: r.name, value: parseInt(r.value) }));
`;
code = code.replace(
  /let allNatsRes = await pool\.query/g,
  chartInsert + '\n    let allNatsRes = await pool.query'
);

// 4. Add metadata for provinces
code = code.replace(
  /const allGendersRes = await pool\.query.*?;/g,
  `const allGendersRes = await pool.query(\`SELECT DISTINCT COALESCE(NULLIF(TRIM(gender), ''), 'ไม่ระบุ') as gen FROM missing_persons ORDER BY gen\`);
    const allProvincesRes = await pool.query(\`SELECT DISTINCT COALESCE(NULLIF(TRIM(detected_location_province), ''), 'ไม่ระบุ') as prov FROM cases ORDER BY prov\`);`
);
code = code.replace(
  /allGenders: \["ทั้งหมด", \.\.\.allGendersRes\.rows\.map\(r => r\.gen\)\],/g,
  `allGenders: ["ทั้งหมด", ...allGendersRes.rows.map(r => r.gen)],
        allProvinces: ["ทั้งหมด", ...allProvincesRes.rows.map(r => r.prov)],`
);

fs.writeFileSync('controllers/dashboardController.js', code);
console.log('dashboardController.js updated successfully.');
