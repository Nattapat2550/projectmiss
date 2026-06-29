const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { uploadToDrive } = require("../services/googleDriveService"); 
const { safeParseDate, normalizeNationality, processName, findValue, determineGender, parseThaiDateToDate } = require("../utils/missingHelpers");



exports.getMissingPersons = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            sortBy,
            sortOrder = "desc",
            search
        } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;

        let conditions = [];
        let queryParams = [];
        let paramIndex = 1;

        // Search filter — ค้นหาชื่อ, เลขประจำตัว, พาสปอร์ต, สัญชาติ, สถานที่ ฯลฯ
        if (search && search.trim()) {
            const searchTerms = search.trim().split(/\s+/);
            const searchConditions = searchTerms.map(term => {
                const likeParam = `%${term}%`;
                const condition = `(
                    mp.first_name_th ILIKE $${paramIndex}
                    OR mp.middle_name_th ILIKE $${paramIndex}
                    OR mp.last_name_th ILIKE $${paramIndex}
                    OR mp.first_name_en ILIKE $${paramIndex}
                    OR mp.middle_name_en ILIKE $${paramIndex}
                    OR mp.last_name_en ILIKE $${paramIndex}
                    OR mp.nationality ILIKE $${paramIndex}
                    OR mp.gender ILIKE $${paramIndex}
                    OR mp.missing_id_card_passport ILIKE $${paramIndex}
                    OR mp.passport_number ILIKE $${paramIndex}
                    OR CAST(mp.age AS TEXT) ILIKE $${paramIndex}
                    OR c.detected_location_details ILIKE $${paramIndex}
                    OR c.detected_location_sub_district ILIKE $${paramIndex}
                    OR c.detected_location_district ILIKE $${paramIndex}
                    OR c.detected_location_province ILIKE $${paramIndex}
                    OR c.police_station ILIKE $${paramIndex}
                    OR c.incident_summary ILIKE $${paramIndex}
                    OR c.case_number ILIKE $${paramIndex}
                    OR i.first_name_th ILIKE $${paramIndex}
                    OR i.last_name_th ILIKE $${paramIndex}
                )`;
                queryParams.push(likeParam);
                paramIndex++;
                return condition;
            });
            conditions.push(searchConditions.join(" AND "));
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

        // Sort
        let orderClause = `ORDER BY c.created_at DESC NULLS LAST, mp.missing_person_id DESC`;
        if (sortBy) {
            const field = String(sortBy).trim();
            const dir = String(sortOrder).trim().toLowerCase() === "asc" ? "ASC" : "DESC";
            let sortExpr = null;
            switch (field) {
                case "name": sortExpr = `NULLIF(TRIM(mp.first_name_th), '') ${dir} NULLS LAST`; break;
                case "missing_date": sortExpr = `c.missing_date ${dir} NULLS LAST`; break;
                case "missing_id_card_passport": sortExpr = `NULLIF(TRIM(mp.missing_id_card_passport), '') ${dir} NULLS LAST`; break;
                case "missing_location": sortExpr = `NULLIF(TRIM(c.detected_location_province), '') ${dir} NULLS LAST`; break;
                case "nationality": sortExpr = `NULLIF(TRIM(mp.nationality), '') ${dir} NULLS LAST`; break;
                case "age": sortExpr = `mp.age ${dir} NULLS LAST`; break;
                case "gender": sortExpr = `NULLIF(TRIM(mp.gender), '') ${dir} NULLS LAST`; break;
                case "human_trafficking": sortExpr = `NULLIF(TRIM(c.human_trafficking_indicators), '') ${dir} NULLS LAST`; break;
                case "status": sortExpr = `(CASE WHEN c.found_date IS NOT NULL OR (c.operation_result ILIKE '%พบตัว%' AND c.operation_result NOT ILIKE '%ไม่พบตัว%') THEN 0 ELSE 1 END) ${dir}`; break;
            }
            if (sortExpr) {
                orderClause = `ORDER BY ${sortExpr}, mp.missing_person_id DESC`;
            }
        }

        // Main data query
        const dataQuery = `
            SELECT
                mp.missing_person_id,
                mp.first_name_th,
                mp.last_name_th,
                mp.first_name_en,
                mp.last_name_en,
                mp.age,
                mp.gender,
                mp.nationality,
                mp.passport_number,
                mp.missing_id_card_passport,
                c.case_id,
                c.missing_date,
                c.missing_time,
                c.detected_location_details,
                c.detected_location_sub_district,
                c.detected_location_district,
                c.detected_location_province,
                c.photo_url,
                c.found_date,
                c.reported_date,
                c.case_number,
                c.operation_result,
                c.police_station,
                c.incident_summary,
                c.human_trafficking_indicators,
                c.notes
            FROM missing_persons mp
            LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
            LEFT JOIN informants i ON c.informant_id = i.informant_id
            ${whereClause}
            ${orderClause}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        const dataResult = await pool.query(dataQuery, [...queryParams, limitNum, offset]);

        // Count query
        const countQuery = `
            SELECT COUNT(*)
            FROM missing_persons mp
            LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
            LEFT JOIN informants i ON c.informant_id = i.informant_id
            ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams);
        const totalItems = parseInt(countResult.rows[0].count);

        res.status(200).json({
            success: true,
            meta: {
                totalItems,
                totalPages: Math.ceil(totalItems / limitNum) || 1,
                currentPage: pageNum,
            },
            tableData: dataResult.rows,
        });
    } catch (err) {
        console.error("Get Missing Persons Error:", err.message);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล: " + err.message });
    }
};

// ============================================================
// POST /api/v1/missing — เพิ่มข้อมูลบุคคลสูญหายรายเดียว (จากฟอร์ม)
// ============================================================
exports.createMissingPerson = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            missing_first_name_th,
            missing_last_name_th,
            missing_first_name_en,
            missing_last_name_en,
            age,
            gender,
            nationality,
            passport_number,
            missing_id_card_passport,
            missing_date,
            missing_time,
            detected_location_details,
            detected_location_sub_district,
            detected_location_district,
            detected_location_province,
            incident_summary,
            informant_first_name_th,
            informant_last_name_th,
            informant_age,
            informant_gender,
            informant_nationality,
            police_station,
            human_trafficking_indicators,
            notes,
        } = req.body;

        if (!missing_first_name_th || !missing_first_name_th.trim() || !missing_last_name_th || !missing_last_name_th.trim()) {
            return res.status(400).json({ success: false, message: "กรุณากรอกชื่อและนามสกุลบุคคลสูญหาย" });
        }

        await client.query("BEGIN");

        // 1. Insert missing_persons
        let ageInt = parseInt(age);
        let validAge = isNaN(ageInt) ? null : ageInt;

        const missingQuery = `
            INSERT INTO missing_persons (first_name_th, last_name_th, first_name_en, last_name_en, age, gender, nationality, passport_number, missing_id_card_passport)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING missing_person_id
        `;
        const missingRes = await client.query(missingQuery, [
            validateLen(missing_first_name_th, 255),
            validateLen(missing_last_name_th, 255),
            validateLen(missing_first_name_en, 255),
            validateLen(missing_last_name_en, 255),
            validAge,
            validateLen(gender, 50),
            validateLen(nationality, 100),
            validateLen(passport_number, 50),
            validateLen(missing_id_card_passport, 50),
        ]);
        const missing_person_id = missingRes.rows[0].missing_person_id;

        // 2. Insert informant (ถ้ามี)
        let informant_id = null;
        if (informant_first_name_th && informant_first_name_th.trim()) {
            const informantAgeInt = parseInt(informant_age);
            const informantValidAge = isNaN(informantAgeInt) ? null : informantAgeInt;
            const informantQuery = `
                INSERT INTO informants (first_name_th, last_name_th, age, gender, nationality)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING informant_id
            `;
            const informantRes = await client.query(informantQuery, [
                validateLen(informant_first_name_th, 255), 
                validateLen(informant_last_name_th, 255), 
                informantValidAge, 
                validateLen(informant_gender, 50), 
                validateLen(informant_nationality, 100)
            ]);
            informant_id = informantRes.rows[0].informant_id;
        }

        // 3. Upload photo to Google Drive (ถ้ามี)
        let drivePhotoUrl = null;
        if (req.file && req.file.buffer) {
            try {
                const tempFileName = `missing_${Date.now()}_${Math.floor(Math.random() * 1000)}.${req.file.originalname.split('.').pop() || 'jpeg'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: req.file.mimetype,
                    buffer: req.file.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_ID);
                if (driveResult && driveResult.webViewLink) {
                    drivePhotoUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("Photo upload error:", e.message);
                // ไม่ throw — ให้บันทึกข้อมูลอื่นต่อแม้อัปโหลดรูปไม่สำเร็จ
            }
        }

        // 4. Insert case
        const parseMissingDate = missing_date ? parseDateForDB(missing_date) || missing_date : null;

        const caseQuery = `
            INSERT INTO cases (
                missing_person_id, informant_id, 
                missing_date, missing_time, detected_location_details,
                detected_location_sub_district, detected_location_district, detected_location_province,
                incident_summary, police_station, human_trafficking_indicators,
                notes, photo_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING case_id
        `;
        await client.query(caseQuery, [
            missing_person_id,
            informant_id,
            parseMissingDate,
            missing_time || null,
            detected_location_details || null,
            detected_location_sub_district || null,
            detected_location_district || null,
            detected_location_province || null,
            incident_summary || null,
            validateLen(police_station, 255),
            human_trafficking_indicators === "true" || human_trafficking_indicators === true ? "มี" : null,
            notes || null,
            drivePhotoUrl,
        ]);

        await client.query("COMMIT");

        res.status(201).json({
            success: true,
            message: "บันทึกข้อมูลบุคคลสูญหายสำเร็จ",
            missing_person_id,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Create Missing Person Error:", err.message);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message });
    } finally {
        client.release();
    }
};

// ============================================================
// GET /api/v1/missing/:id — ดึงข้อมูลบุคคลสูญหายรายเดียว (ครบทุกตาราง)
// ============================================================
exports.getMissingPersonById = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT
                mp.missing_person_id,
                mp.first_name_th AS missing_first_name_th,
                mp.last_name_th AS missing_last_name_th,
                mp.first_name_en AS missing_first_name_en,
                mp.last_name_en AS missing_last_name_en,
                mp.age,
                mp.gender,
                mp.nationality,
                mp.passport_number,
                mp.missing_id_card_passport,
                c.case_id,
                c.relationship,
                c.entry_channel,
                c.entry_checkpoint_province,
                c.airline,
                c.entry_date,
                c.detected_location_details,
                c.detected_location_sub_district,
                c.detected_location_district,
                c.detected_location_province,
                c.missing_date,
                c.missing_time,
                c.photo_url,
                c.investigating_officer,
                c.reported_date,
                c.receiving_channel,
                c.incident_summary,
                c.case_number,
                c.pjv_number,
                c.pjv_file_url,
                c.human_trafficking_indicators,
                c.victim_classification,
                c.human_trafficking_type,
                c.action_taken,
                c.operation_result,
                c.police_station,
                c.found_date,
                c.notes,
                i.informant_id,
                i.first_name_th AS informant_first_name_th,
                i.last_name_th AS informant_last_name_th,
                i.age AS informant_age,
                i.gender AS informant_gender,
                i.nationality AS informant_nationality,
                i.informant_id_card_passport,
                i.informant_contact_channel,
                i.informant_phone,
                i.informant_email,
                a.agency_id,
                a.command_center,
                a.station,
                a.receiving_officer,
                a.division_1,
                a.division_2,
                a.division_3,
                a.division_4,
                a.division_5,
                a.division_6,
                a.division_7,
                a.division_8,
                a.division_9,
                a.division_10,
                a.division_11,
                a.division_12,
                a.division_13
            FROM missing_persons mp
            LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
            LEFT JOIN informants i ON c.informant_id = i.informant_id
            LEFT JOIN agencies a ON c.agency_id = a.agency_id
            WHERE mp.missing_person_id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลบุคคลสูญหาย' });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Get Missing Person By ID Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================================
// PUT /api/v1/missing/:id — แก้ไขข้อมูลบุคคลสูญหาย
// ============================================================
exports.updateMissingPerson = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            missing_first_name_th, missing_middle_name_th, missing_last_name_th,
            missing_first_name_en, missing_middle_name_en, missing_last_name_en,
            age, gender, nationality, passport_number, missing_id_card_passport,
            missing_date, missing_time, detected_location_details,
            detected_location_sub_district, detected_location_district, detected_location_province,
            incident_summary,
            informant_first_name_th, informant_middle_name_th, informant_last_name_th,
            informant_first_name_en, informant_middle_name_en, informant_last_name_en,
            informant_age, informant_gender, informant_nationality,
            informant_id_card_passport, informant_phone, informant_email, relationship,
            police_station, human_trafficking_indicators, notes, case_number, pjv_number,
            investigating_officer, operation_result, found_date, reported_date
        } = req.body;

        await client.query("BEGIN");

        // 1. Update missing_persons
        let ageInt = parseInt(age);
        let validAge = isNaN(ageInt) ? null : ageInt;

        await client.query(`
            UPDATE missing_persons
            SET first_name_th = $1, middle_name_th = $2, last_name_th = $3,
                first_name_en = $4, middle_name_en = $5, last_name_en = $6,
                age = $7, gender = $8, nationality = $9, passport_number = $10, missing_id_card_passport = $11
            WHERE missing_person_id = $12
        `, [
            missing_first_name_th, missing_middle_name_th, missing_last_name_th,
            missing_first_name_en, missing_middle_name_en, missing_last_name_en,
            validAge, gender, nationality, passport_number, missing_id_card_passport,
            id
        ]);

        // 2. Upload photo to Google Drive (ถ้ามีรูปใหม่)
        let drivePhotoUrl = null;
        if (req.file && req.file.buffer) {
            try {
                const tempFileName = `missing_update_${Date.now()}_${Math.floor(Math.random() * 1000)}.${req.file.originalname.split('.').pop() || 'jpeg'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: req.file.mimetype,
                    buffer: req.file.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_ID);
                if (driveResult && driveResult.webViewLink) {
                    drivePhotoUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("Photo upload error:", e.message);
            }
        }

        // 3. Update cases
        // Fetch current case to get informant_id
        const caseRes = await client.query("SELECT case_id, informant_id FROM cases WHERE missing_person_id = $1 LIMIT 1", [id]);
        if (caseRes.rows.length === 0) {
            throw new Error("ไม่พบข้อมูลคดี");
        }
        const { case_id, informant_id } = caseRes.rows[0];

        const parseMissingDate = missing_date ? parseDateForDB(missing_date) || missing_date : null;
        const parseFoundDate = found_date ? parseDateForDB(found_date) || found_date : null;
        const parseReportedDate = reported_date ? parseDateForDB(reported_date) || reported_date : null;

        let caseUpdateQuery = `
            UPDATE cases
            SET missing_date = $1, missing_time = $2, detected_location_details = $3,
                detected_location_sub_district = $4, detected_location_district = $5, detected_location_province = $6,
                incident_summary = $7, police_station = $8, human_trafficking_indicators = $9, notes = $10,
                case_number = $11, pjv_number = $12, investigating_officer = $13, operation_result = $14,
                found_date = $15, reported_date = $16, relationship = $17
        `;
        let caseParams = [
            parseMissingDate, missing_time, detected_location_details,
            detected_location_sub_district, detected_location_district, detected_location_province,
            incident_summary, police_station, human_trafficking_indicators, notes,
            case_number, pjv_number, investigating_officer, operation_result,
            parseFoundDate, parseReportedDate, relationship
        ];

        if (drivePhotoUrl) {
            caseUpdateQuery += `, photo_url = $18 WHERE case_id = $19`;
            caseParams.push(drivePhotoUrl, case_id);
        } else {
            caseUpdateQuery += ` WHERE case_id = $18`;
            caseParams.push(case_id);
        }

        await client.query(caseUpdateQuery, caseParams);

        // 4. Update informant
        if (informant_id) {
            const informantAgeInt = parseInt(informant_age);
            const informantValidAge = isNaN(informantAgeInt) ? null : informantAgeInt;
            
            await client.query(`
                UPDATE informants
                SET first_name_th = $1, middle_name_th = $2, last_name_th = $3,
                    first_name_en = $4, middle_name_en = $5, last_name_en = $6,
                    age = $7, gender = $8, nationality = $9, informant_id_card_passport = $10,
                    informant_phone = $11, informant_email = $12
                WHERE informant_id = $13
            `, [
                informant_first_name_th, informant_middle_name_th, informant_last_name_th,
                informant_first_name_en, informant_middle_name_en, informant_last_name_en,
                informantValidAge, informant_gender, informant_nationality, informant_id_card_passport,
                informant_phone, informant_email,
                informant_id
            ]);
        }

        await client.query("COMMIT");
        res.status(200).json({ success: true, message: "แก้ไขข้อมูลสำเร็จ" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Update Missing Person Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};

// ============================================================
// DELETE /api/v1/missing/:id — ลบข้อมูลบุคคลสูญหาย
// ============================================================
exports.deleteMissingPerson = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query("BEGIN");
        
        // cascade deletion should handle cases and other tables if foreign keys are setup correctly.
        // If not, we should manually delete from cases, informants, and agencies.
        // I will assume cases table references missing_persons with ON DELETE CASCADE. 
        // If not, delete cases first:
        const caseRes = await client.query("SELECT informant_id, agency_id FROM cases WHERE missing_person_id = $1", [id]);
        if (caseRes.rows.length > 0) {
            await client.query("DELETE FROM cases WHERE missing_person_id = $1", [id]);
            for (const row of caseRes.rows) {
                if (row.informant_id) {
                    await client.query("DELETE FROM informants WHERE informant_id = $1", [row.informant_id]);
                }
                if (row.agency_id) {
                    await client.query("DELETE FROM agencies WHERE agency_id = $1", [row.agency_id]);
                }
            }
        }

        await client.query("DELETE FROM missing_persons WHERE missing_person_id = $1", [id]);

        await client.query("COMMIT");
        res.status(200).json({ success: true, message: "ลบข้อมูลสำเร็จ" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Delete Missing Person Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        client.release();
    }
};