const pool = require("../config/db");
const { uploadWithRetry, validateLen, parseDateForDB } = require("../utils/uploadHelpers");

const fetchMissingPersons = async ({ page, limit, sortBy, sortOrder, search }) => {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offset = (pageNum - 1) * limitNum;

    let conditions = [];
    let queryParams = [];
    let paramIndex = 1;

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
            case "age": sortExpr = `mp.date_of_birth ${dir} NULLS LAST`; break; // Sort by date_of_birth
            case "gender": sortExpr = `NULLIF(TRIM(mp.gender), '') ${dir} NULLS LAST`; break;
            case "human_trafficking": sortExpr = `c.human_trafficking_indicators ${dir} NULLS LAST`; break;
            case "status": sortExpr = `(CASE WHEN c.found_date IS NOT NULL OR c.operation_result = true THEN 0 ELSE 1 END) ${dir}`; break;
        }
        if (sortExpr) {
            orderClause = `ORDER BY ${sortExpr}, mp.missing_person_id DESC`;
        }
    }

    const dataQuery = `
        SELECT
            mp.missing_person_id, mp.first_name_th, mp.last_name_th, mp.first_name_en, mp.last_name_en,
            mp.date_of_birth, mp.gender, mp.nationality, mp.passport_number, mp.missing_id_card_passport,
            c.case_id, c.missing_date, c.missing_time, c.detected_location_details,
            c.detected_location_sub_district, c.detected_location_district, c.detected_location_province,
            c.photo_url, c.found_date, c.reported_date, c.case_number, c.operation_result, c.police_station,
            c.incident_summary, c.human_trafficking_indicators, c.notes
        FROM missing_persons mp
        LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
        LEFT JOIN informants i ON c.informant_id = i.informant_id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await pool.query(dataQuery, [...queryParams, limitNum, offset]);

    const countQuery = `
        SELECT COUNT(*)
        FROM missing_persons mp
        LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
        LEFT JOIN informants i ON c.informant_id = i.informant_id
        ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);

    return {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
        currentPage: pageNum,
        tableData: dataResult.rows
    };
};

const getDobFromAgeOrDob = (age, dob) => {
    if (dob) return parseDateForDB(dob);
    const ageInt = parseInt(age);
    if (!isNaN(ageInt)) {
        const currentYear = new Date().getFullYear();
        return `${currentYear - ageInt}-01-01`;
    }
    return null;
};

const createMissingPersonRecord = async (data, file) => {
    const client = await pool.connect();
    try {
        const {
            missing_first_name_th, missing_last_name_th, missing_first_name_en, missing_last_name_en,
            age, date_of_birth, gender, nationality, passport_number, missing_id_card_passport, missing_date, missing_time,
            detected_location_details, detected_location_sub_district, detected_location_district, detected_location_province,
            incident_summary, informant_first_name_th, informant_last_name_th, informant_age, informant_date_of_birth, informant_gender,
            informant_nationality, police_station, human_trafficking_indicators, notes,
            entry_channel, entry_checkpoint_province, airline, entry_date, investigating_officer,
            reported_date, receiving_channel, case_number, pjv_number, pjv_file_url, operation_result,
            found_date, victim_classification, human_trafficking_type, action_taken
        } = data;

        await client.query("BEGIN");

        const missingDob = getDobFromAgeOrDob(age, date_of_birth);

        const missingQuery = `
            INSERT INTO missing_persons (first_name_th, last_name_th, first_name_en, last_name_en, date_of_birth, gender, nationality, passport_number, missing_id_card_passport)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING missing_person_id
        `;
        const missingRes = await client.query(missingQuery, [
            validateLen(missing_first_name_th, 255),
            validateLen(missing_last_name_th, 255),
            validateLen(missing_first_name_en, 255),
            validateLen(missing_last_name_en, 255),
            missingDob,
            validateLen(gender, 50),
            validateLen(nationality, 100),
            validateLen(passport_number, 50),
            validateLen(missing_id_card_passport, 50),
        ]);
        const missing_person_id = missingRes.rows[0].missing_person_id;

        let informant_id = null;
        if (informant_first_name_th && informant_first_name_th.trim()) {
            const informantDob = getDobFromAgeOrDob(informant_age, informant_date_of_birth);
            const informantQuery = `
                INSERT INTO informants (first_name_th, last_name_th, date_of_birth, gender, nationality)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING informant_id
            `;
            const informantRes = await client.query(informantQuery, [
                validateLen(informant_first_name_th, 255), 
                validateLen(informant_last_name_th, 255), 
                informantDob, 
                validateLen(informant_gender, 50), 
                validateLen(informant_nationality, 100)
            ]);
            informant_id = informantRes.rows[0].informant_id;
        }

        let drivePhotoUrl = null;
        if (file && file.buffer) {
            try {
                const tempFileName = `missing_${Date.now()}_${Math.floor(Math.random() * 1000)}.${file.originalname.split('.').pop() || 'jpeg'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: file.mimetype,
                    buffer: file.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_ID);
                if (driveResult && driveResult.webViewLink) {
                    drivePhotoUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("Photo upload error:", e.message);
            }
        }

        const parseMissingDate = missing_date ? parseDateForDB(missing_date) || missing_date : null;
        const parseEntryDate = entry_date ? parseDateForDB(entry_date) || entry_date : null;
        const parseReportedDate = reported_date ? parseDateForDB(reported_date) || reported_date : null;
        const parseFoundDate = found_date ? parseDateForDB(found_date) || found_date : null;

        const caseQuery = `
            INSERT INTO cases (
                missing_person_id, informant_id, 
                missing_date, missing_time, detected_location_details,
                detected_location_sub_district, detected_location_district, detected_location_province,
                incident_summary, police_station, human_trafficking_indicators,
                notes, photo_url, entry_channel, entry_checkpoint_province, airline, entry_date,
                investigating_officer, reported_date, receiving_channel, case_number, pjv_number,
                pjv_file_url, operation_result, found_date, victim_classification,
                human_trafficking_type, action_taken
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
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
            human_trafficking_indicators === "true" || human_trafficking_indicators === true,
            notes || null,
            drivePhotoUrl,
            validateLen(entry_channel, 255),
            validateLen(entry_checkpoint_province, 255),
            validateLen(airline, 100),
            parseEntryDate,
            validateLen(investigating_officer, 255),
            parseReportedDate,
            validateLen(receiving_channel, 255),
            validateLen(case_number, 100),
            validateLen(pjv_number, 100),
            pjv_file_url || null,
            operation_result === "true" || operation_result === true,
            parseFoundDate,
            victim_classification || null,
            validateLen(human_trafficking_type, 255),
            action_taken || null
        ]);

        await client.query("COMMIT");
        return missing_person_id;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};

const fetchMissingPersonById = async (id) => {
    const query = `
        SELECT
            mp.missing_person_id, mp.first_name_th AS missing_first_name_th, mp.last_name_th AS missing_last_name_th,
            mp.first_name_en AS missing_first_name_en, mp.last_name_en AS missing_last_name_en,
            mp.date_of_birth, mp.gender, mp.nationality, mp.passport_number, mp.missing_id_card_passport,
            c.case_id, c.relationship, c.entry_channel, c.entry_checkpoint_province, c.airline, c.entry_date,
            c.detected_location_details, c.detected_location_sub_district, c.detected_location_district, c.detected_location_province,
            c.missing_date, c.missing_time, c.photo_url, c.investigating_officer, c.reported_date, c.receiving_channel,
            c.incident_summary, c.case_number, c.pjv_number, c.pjv_file_url, c.human_trafficking_indicators,
            c.victim_classification, c.human_trafficking_type, c.action_taken, c.operation_result, c.police_station,
            c.found_date, c.notes,
            i.informant_id, i.first_name_th AS informant_first_name_th, i.last_name_th AS informant_last_name_th,
            i.date_of_birth AS informant_date_of_birth, i.gender AS informant_gender, i.nationality AS informant_nationality,
            i.informant_id_card_passport, i.informant_contact_channel, i.informant_phone, i.informant_email,
            a.agency_id, a.command_center, a.station, a.receiving_officer, a.division_1, a.division_2,
            a.division_3, a.division_4, a.division_5, a.division_6, a.division_7, a.division_8,
            a.division_9, a.division_10, a.division_11, a.division_12, a.division_13
        FROM missing_persons mp
        LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
        LEFT JOIN informants i ON c.informant_id = i.informant_id
        LEFT JOIN agencies a ON c.agency_id = a.agency_id
        WHERE mp.missing_person_id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

const updateMissingPersonRecord = async (id, data, file) => {
    const client = await pool.connect();
    try {
        const {
            missing_first_name_th, missing_middle_name_th, missing_last_name_th, missing_first_name_en, missing_middle_name_en, missing_last_name_en,
            age, date_of_birth, gender, nationality, passport_number, missing_id_card_passport, missing_date, missing_time, detected_location_details,
            detected_location_sub_district, detected_location_district, detected_location_province, incident_summary,
            informant_first_name_th, informant_middle_name_th, informant_last_name_th, informant_first_name_en, informant_middle_name_en, informant_last_name_en,
            informant_age, informant_date_of_birth, informant_gender, informant_nationality, informant_id_card_passport, informant_phone, informant_email, relationship,
            police_station, human_trafficking_indicators, notes, case_number, pjv_number, investigating_officer, operation_result, found_date, reported_date,
            entry_channel, entry_checkpoint_province, airline, entry_date, receiving_channel, pjv_file_url, victim_classification, human_trafficking_type, action_taken
        } = data;

        await client.query("BEGIN");

        const missingDob = getDobFromAgeOrDob(age, date_of_birth);

        await client.query(`
            UPDATE missing_persons
            SET first_name_th = $1, middle_name_th = $2, last_name_th = $3,
                first_name_en = $4, middle_name_en = $5, last_name_en = $6,
                date_of_birth = $7, gender = $8, nationality = $9, passport_number = $10, missing_id_card_passport = $11
            WHERE missing_person_id = $12
        `, [
            missing_first_name_th, missing_middle_name_th, missing_last_name_th,
            missing_first_name_en, missing_middle_name_en, missing_last_name_en,
            missingDob, gender, nationality, passport_number, missing_id_card_passport,
            id
        ]);

        let drivePhotoUrl = null;
        if (file && file.buffer) {
            try {
                const tempFileName = `missing_update_${Date.now()}_${Math.floor(Math.random() * 1000)}.${file.originalname.split('.').pop() || 'jpeg'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: file.mimetype,
                    buffer: file.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_ID);
                if (driveResult && driveResult.webViewLink) {
                    drivePhotoUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("Photo upload error:", e.message);
            }
        }

        const caseRes = await client.query("SELECT case_id, informant_id FROM cases WHERE missing_person_id = $1 LIMIT 1", [id]);
        if (caseRes.rows.length === 0) throw new Error("ไม่พบข้อมูลคดี");
        const { case_id, informant_id } = caseRes.rows[0];

        const parseMissingDate = missing_date ? parseDateForDB(missing_date) || missing_date : null;
        const parseFoundDate = found_date ? parseDateForDB(found_date) || found_date : null;
        const parseReportedDate = reported_date ? parseDateForDB(reported_date) || reported_date : null;
        const parseEntryDate = entry_date ? parseDateForDB(entry_date) || entry_date : null;

        let caseUpdateQuery = `
            UPDATE cases
            SET missing_date = $1, missing_time = $2, detected_location_details = $3,
                detected_location_sub_district = $4, detected_location_district = $5, detected_location_province = $6,
                incident_summary = $7, police_station = $8, human_trafficking_indicators = $9, notes = $10,
                case_number = $11, pjv_number = $12, investigating_officer = $13, operation_result = $14,
                found_date = $15, reported_date = $16, relationship = $17,
                entry_channel = $18, entry_checkpoint_province = $19, airline = $20, entry_date = $21,
                receiving_channel = $22, pjv_file_url = $23, victim_classification = $24,
                human_trafficking_type = $25, action_taken = $26
        `;
        let caseParams = [
            parseMissingDate, missing_time, detected_location_details,
            detected_location_sub_district, detected_location_district, detected_location_province,
            incident_summary, police_station, human_trafficking_indicators, notes,
            case_number, pjv_number, investigating_officer, operation_result,
            parseFoundDate, parseReportedDate, relationship,
            entry_channel, entry_checkpoint_province, airline, parseEntryDate,
            receiving_channel, pjv_file_url, victim_classification,
            human_trafficking_type, action_taken
        ];

        if (drivePhotoUrl) {
            caseUpdateQuery += `, photo_url = $27 WHERE case_id = $28`;
            caseParams.push(drivePhotoUrl, case_id);
        } else {
            caseUpdateQuery += ` WHERE case_id = $27`;
            caseParams.push(case_id);
        }

        await client.query(caseUpdateQuery, caseParams);

        if (informant_id) {
            const informantDob = getDobFromAgeOrDob(informant_age, informant_date_of_birth);
            
            await client.query(`
                UPDATE informants
                SET first_name_th = $1, middle_name_th = $2, last_name_th = $3,
                    first_name_en = $4, middle_name_en = $5, last_name_en = $6,
                    date_of_birth = $7, gender = $8, nationality = $9, informant_id_card_passport = $10,
                    informant_phone = $11, informant_email = $12
                WHERE informant_id = $13
            `, [
                informant_first_name_th, informant_middle_name_th, informant_last_name_th,
                informant_first_name_en, informant_middle_name_en, informant_last_name_en,
                informantDob, informant_gender, informant_nationality, informant_id_card_passport,
                informant_phone, informant_email,
                informant_id
            ]);
        }

        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const removeMissingPerson = async (id) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
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
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    fetchMissingPersons,
    createMissingPersonRecord,
    fetchMissingPersonById,
    updateMissingPersonRecord,
    removeMissingPerson
};
