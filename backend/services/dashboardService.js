const { convertBEtoAD } = require("../utils/immigrantHelpers");

exports.buildDashboardQuerySQL = (query, type) => {
  const { search, sortBy, sortOrder, startDate, endDate, dobStart, dobEnd, creator } = query;
  
  const sDate = convertBEtoAD(startDate);
  const eDate = convertBEtoAD(endDate);
  const dStart = convertBEtoAD(dobStart);
  const dEnd = convertBEtoAD(dobEnd);

  let conditions = [];
  let params = [];
  let paramIdx = 1;

  if (sDate || eDate) {
    const dateField = type === "deported" ? "t.return_date" : "t.detected_date";
    if (sDate && eDate) {
      conditions.push(`DATE(${dateField}) >= $${paramIdx} AND DATE(${dateField}) <= $${paramIdx + 1}`);
      params.push(sDate, eDate);
      paramIdx += 2;
    } else if (sDate) {
      conditions.push(`DATE(${dateField}) >= $${paramIdx}`);
      params.push(sDate);
      paramIdx++;
    } else if (eDate) {
      conditions.push(`DATE(${dateField}) <= $${paramIdx}`);
      params.push(eDate);
      paramIdx++;
    }
  }

  if (dStart || dEnd) {
    if (dStart && dEnd) {
      conditions.push(`DATE(t.date_of_birth) >= $${paramIdx} AND DATE(t.date_of_birth) <= $${paramIdx + 1}`);
      params.push(dStart, dEnd);
      paramIdx += 2;
    } else if (dStart) {
      conditions.push(`DATE(t.date_of_birth) >= $${paramIdx}`);
      params.push(dStart);
      paramIdx++;
    } else if (dEnd) {
      conditions.push(`DATE(t.date_of_birth) <= $${paramIdx}`);
      params.push(dEnd);
      paramIdx++;
    }
  }

  // เพิ่มเงื่อนไขค้นหาด้วยชื่อผู้เพิ่มข้อมูล
  if (creator && creator !== "ทั้งหมด" && creator.trim() !== "") {
    conditions.push(`u.name = $${paramIdx}`);
    params.push(creator);
    paramIdx++;
  }

  if (search && search.trim() !== "") {
    const keywords = search.trim().split(/\s+/);
    const searchConditions = keywords.map((keyword) => {
      const kw = `%${keyword}%`;
      let fields = `t.first_name_th ILIKE $${paramIdx} OR t.last_name_th ILIKE $${paramIdx} OR t.first_name_en ILIKE $${paramIdx} OR t.last_name_en ILIKE $${paramIdx} OR t.passport_id ILIKE $${paramIdx}`;
      
      if (type === "deported") {
        fields += ` OR t.national_id ILIKE $${paramIdx} OR t.channel ILIKE $${paramIdx}`;
      } else {
        fields += ` OR t.nationality ILIKE $${paramIdx} OR t.detected_location ILIKE $${paramIdx}`;
      }
      
      params.push(kw);
      const str = `(${fields})`;
      paramIdx++;
      return str;
    });
    conditions.push(`(${searchConditions.join(" AND ")})`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderClause = "";
  const dir = sortOrder === "desc" ? "DESC" : "ASC";
  if (sortBy && sortBy.trim() !== "") {
    if (sortBy === "name") {
        orderClause = `ORDER BY t.first_name_th ${dir} NULLS LAST, t.last_name_th ${dir} NULLS LAST, t.id DESC`;
    } else {
        orderClause = `ORDER BY t.${sortBy} ${dir} NULLS LAST, t.id DESC`;
    }
  } else {
    const defaultField = type === "deported" ? "t.return_date" : "t.detected_date";
    orderClause = `ORDER BY ${defaultField} DESC NULLS LAST, t.id DESC`;
  }

  return { whereClause, params, orderClause };
};