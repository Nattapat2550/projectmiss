import pool from "../config/db";
import {  uploadWithRetry, validateLen, parseDateForDB  } from "../utils/uploadHelpers";
import { getRegionFromProvince } from "../utils/regionMapper";

export const fetchMissingPersons = async (params) => {
    const { page = 1, limit = 50, sortBy, sortOrder = "desc", search, command_center, division_name } = params;
    
    const limitNum = parseInt(limit, 10);
    const offset = (parseInt(page, 10) - 1) * limitNum;

    let conditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (command_center && command_center.trim() && command_center.trim() !== "ทั้งหมด") {
        conditions.push(`a.command_center = $${paramIndex}`);
        queryParams.push(command_center.trim());
        paramIndex++;
    }

    if (division_name && division_name.trim() && division_name.trim() !== "ทั้งหมด") {
        conditions.push(`a.division_name = $${paramIndex}`);
        queryParams.push(division_name.trim());
        paramIndex++;
    }

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
                OR c.detected_location_region ILIKE $${paramIndex}
                OR a.command_center ILIKE $${paramIndex}
                OR a.division_name ILIKE $${paramIndex}
                OR a.station ILIKE $${paramIndex}
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
            case "name": sortExpr = `COALESCE(NULLIF(NULLIF(TRIM(mp.first_name_th), ''), 'ไม่ระบุ'), NULLIF(NULLIF(TRIM(mp.first_name_en), ''), 'ไม่ระบุ')) ${dir} NULLS LAST`; break;
            case "missing_date": sortExpr = `c.missing_date ${dir} NULLS LAST`; break;
            case "missing_id_card_passport": sortExpr = `NULLIF(TRIM(mp.missing_id_card_passport), '') ${dir} NULLS LAST`; break;
            case "missing_location": sortExpr = `NULLIF(TRIM(c.detected_location_province), '') ${dir} NULLS LAST`; break;
            case "nationality": sortExpr = `NULLIF(TRIM(mp.nationality), '') ${dir} NULLS LAST`; break;
            case "age": sortExpr = `mp.date_of_birth ${dir === 'ASC' ? 'DESC' : 'ASC'} NULLS LAST`; break;
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
            mp.missing_person_id, mp.first_name_th, mp.middle_name_th, mp.last_name_th, mp.first_name_en, mp.middle_name_en, mp.last_name_en,
            EXTRACT(YEAR FROM age(CURRENT_DATE, mp.date_of_birth)) as age, mp.date_of_birth, mp.gender, mp.nationality, mp.passport_number, mp.missing_id_card_passport,
            c.case_id, c.missing_date, c.missing_time, c.detected_location_details,
            c.detected_location_sub_district, c.detected_location_district, c.detected_location_province, c.detected_location_region,
            c.photo_url, c.passport_photo_url, c.found_date, c.reported_date, c.case_number, c.operation_result,
            c.incident_summary, c.human_trafficking_indicators, c.notes,
            c.pjv_number, c.pjv_file_url, c.victim_classification, c.human_trafficking_type, c.investigating_id,
            c.entry_channel, c.entry_checkpoint_province, c.airline, c.entry_date, c.action_taken, c.relationship, c.receiving_channel,
            i.first_name_th as informant_first_name_th, i.middle_name_th as informant_middle_name_th, i.last_name_th as informant_last_name_th,
            i.first_name_en as informant_first_name_en, i.middle_name_en as informant_middle_name_en, i.last_name_en as informant_last_name_en,
            i.date_of_birth as informant_date_of_birth, i.gender as informant_gender, i.nationality as informant_nationality,
            i.informant_id_card_passport as informant_id_card_passport, i.informant_contact_channel as informant_contact_channel,
            i.informant_phone as informant_phone, i.informant_email as informant_email,
            a.division_name, a.station, a.officer_name
        FROM missing_persons mp
        LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
        LEFT JOIN informants i ON c.informant_id = i.informant_id
        LEFT JOIN agencies a ON c.investigating_id = a.agency_id
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
        LEFT JOIN agencies a ON c.investigating_id = a.agency_id
        ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);

    return {
        totalItems,
        totalPages: Math.ceil(totalItems / limitNum) || 1,
        currentPage: parseInt(page, 10),
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

const createMissingPersonRecord = async (data, file, passportFile, pjvFile) => {
    const client = await pool.connect();
    try {
        const {
            missing_first_name_th, missing_last_name_th, missing_first_name_en, missing_last_name_en,
            age, date_of_birth, gender, nationality, passport_number, missing_id_card_passport, missing_date, missing_time,
            detected_location_details, detected_location_sub_district, detected_location_district, detected_location_province,
            incident_summary, informant_first_name_th, informant_last_name_th, informant_age, informant_date_of_birth, informant_gender,
            informant_nationality, station, human_trafficking_indicators, notes,
            entry_channel, entry_checkpoint_province, airline, entry_date, investigating_id,
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

        let agency_id = null;
        if (data.command_center || data.station || data.officer_name) {
            let agencyCheckQuery = `
                SELECT agency_id FROM agencies 
                WHERE COALESCE(command_center, '') = COALESCE($1, '') 
                  AND COALESCE(station, '') = COALESCE($2, '') 
                  AND COALESCE(officer_name, '') = COALESCE($3, '')
                LIMIT 1
            `;
            let agencyCheckRes = await client.query(agencyCheckQuery, [
                data.command_center || '',
                data.station || '',
                data.officer_name || ''
            ]);

            if (agencyCheckRes.rows.length > 0) {
                agency_id = agencyCheckRes.rows[0].agency_id;
            } else {
                let agencyQuery = `
                    INSERT INTO agencies (
                        command_center, station, officer_name,
                        division_name
                    ) VALUES ($1, $2, $3, $4) 
                    RETURNING agency_id
                `;
                let agencyRes = await client.query(agencyQuery, [
                    data.command_center, data.station, data.officer_name,
                    data.division_name || 'ไม่ระบุ'
                ]);
                agency_id = agencyRes.rows[0].agency_id;
            }
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

        let drivePassportUrl = null;
        if (passportFile && passportFile.buffer) {
            try {
                const tempFileName = `passport_${Date.now()}_${Math.floor(Math.random() * 1000)}.${passportFile.originalname.split('.').pop() || 'jpeg'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: passportFile.mimetype,
                    buffer: passportFile.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_PASSPORT);
                if (driveResult && driveResult.webViewLink) {
                    drivePassportUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("Passport upload error:", e.message);
            }
        }

        let drivePjvUrl = pjv_file_url || null;
        if (pjvFile && pjvFile.buffer) {
            try {
                const tempFileName = `pjv_${Date.now()}_${Math.floor(Math.random() * 1000)}.${pjvFile.originalname.split('.').pop() || 'pdf'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: pjvFile.mimetype,
                    buffer: pjvFile.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_DOCUMENT);
                if (driveResult && driveResult.webViewLink) {
                    drivePjvUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("PJV file upload error:", e.message);
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
                detected_location_sub_district, detected_location_district, detected_location_province, detected_location_region,
                incident_summary, human_trafficking_indicators,
                notes, photo_url, passport_photo_url, entry_channel, entry_checkpoint_province, airline, entry_date,
                investigating_id, reported_date, receiving_channel, case_number, pjv_number,
                pjv_file_url, operation_result, found_date, victim_classification,
                human_trafficking_type, action_taken
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
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
            getRegionFromProvince(detected_location_province),
            incident_summary || null,
            human_trafficking_indicators === "true" || human_trafficking_indicators === true,
            notes || null,
            drivePhotoUrl,
            drivePassportUrl,
            validateLen(entry_channel, 255),
            validateLen(entry_checkpoint_province, 255),
            validateLen(airline, 100),
            parseEntryDate,
            agency_id,
            parseReportedDate,
            validateLen(receiving_channel, 255),
            validateLen(case_number, 100),
            validateLen(pjv_number, 100),
            drivePjvUrl,
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
            c.detected_location_details, c.detected_location_sub_district, c.detected_location_district, c.detected_location_province, c.detected_location_region,
            c.missing_date, c.missing_time, c.photo_url, c.passport_photo_url, c.investigating_id, c.reported_date, c.receiving_channel,
            c.incident_summary, c.case_number, c.pjv_number, c.pjv_file_url, c.human_trafficking_indicators,
            c.victim_classification, c.human_trafficking_type, c.action_taken, c.operation_result,
            c.found_date, c.notes,
            i.informant_id, i.first_name_th AS informant_first_name_th, i.last_name_th AS informant_last_name_th,
            i.date_of_birth AS informant_date_of_birth, i.gender AS informant_gender, i.nationality AS informant_nationality,
            i.informant_id_card_passport, i.informant_contact_channel, i.informant_phone, i.informant_email,
            a.agency_id, a.command_center, a.station, a.officer_name, a.division_name
        FROM missing_persons mp
        LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
        LEFT JOIN informants i ON c.informant_id = i.informant_id
        LEFT JOIN agencies a ON c.investigating_id = a.agency_id
        WHERE mp.missing_person_id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

const updateMissingPersonRecord = async (id, data, file, passportFile, pjvFile) => {
    const client = await pool.connect();
    try {
        const {
            missing_first_name_th, missing_middle_name_th, missing_last_name_th, missing_first_name_en, missing_middle_name_en, missing_last_name_en,
            age, date_of_birth, gender, nationality, passport_number, missing_id_card_passport, missing_date, missing_time, detected_location_details,
            detected_location_sub_district, detected_location_district, detected_location_province, incident_summary,
            informant_first_name_th, informant_middle_name_th, informant_last_name_th, informant_first_name_en, informant_middle_name_en, informant_last_name_en,
            informant_age, informant_date_of_birth, informant_gender, informant_nationality, informant_id_card_passport, informant_phone, informant_email, relationship,
            station, human_trafficking_indicators, notes, case_number, pjv_number, investigating_id, operation_result, found_date, reported_date,
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

        let agency_id = investigating_id;
        if (data.command_center || data.station || data.officer_name) {
            let agencyCheckQuery = `
                SELECT agency_id FROM agencies 
                WHERE COALESCE(command_center, '') = COALESCE($1, '') 
                  AND COALESCE(station, '') = COALESCE($2, '') 
                  AND COALESCE(officer_name, '') = COALESCE($3, '')
                LIMIT 1
            `;
            let agencyCheckRes = await client.query(agencyCheckQuery, [
                data.command_center || '',
                data.station || '',
                data.officer_name || ''
            ]);

            if (agencyCheckRes.rows.length > 0) {
                agency_id = agencyCheckRes.rows[0].agency_id;
            } else {
                let agencyQuery = `
                    INSERT INTO agencies (
                        command_center, station, officer_name,
                        division_name
                    ) VALUES ($1, $2, $3, $4) 
                    RETURNING agency_id
                `;
                let agencyRes = await client.query(agencyQuery, [
                    data.command_center, data.station, data.officer_name,
                    data.division_name || 'ไม่ระบุ'
                ]);
                agency_id = agencyRes.rows[0].agency_id;
            }
        }

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

        let drivePassportUrl = null;
        if (passportFile && passportFile.buffer) {
            try {
                const tempFileName = `passport_update_${Date.now()}_${Math.floor(Math.random() * 1000)}.${passportFile.originalname.split('.').pop() || 'jpeg'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: passportFile.mimetype,
                    buffer: passportFile.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_PASSPORT);
                if (driveResult && driveResult.webViewLink) {
                    drivePassportUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("Passport upload error:", e.message);
            }
        }

        let drivePjvUrl = pjv_file_url || null;
        if (pjvFile && pjvFile.buffer) {
            try {
                const tempFileName = `pjv_update_${Date.now()}_${Math.floor(Math.random() * 1000)}.${pjvFile.originalname.split('.').pop() || 'pdf'}`;
                const driveResult = await uploadWithRetry({
                    originalname: tempFileName,
                    mimetype: pjvFile.mimetype,
                    buffer: pjvFile.buffer,
                }, process.env.GOOGLE_DRIVE_FOLDER_DOCUMENT);
                if (driveResult && driveResult.webViewLink) {
                    drivePjvUrl = driveResult.webViewLink;
                }
            } catch (e) {
                console.error("PJV file upload error:", e.message);
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
                detected_location_sub_district = $4, detected_location_district = $5, detected_location_province = $6, detected_location_region = $7,
                incident_summary = $8, human_trafficking_indicators = $9, notes = $10,
                case_number = $11, pjv_number = $12, investigating_id = $13, operation_result = $14,
                found_date = $15, reported_date = $16, relationship = $17,
                entry_channel = $18, entry_checkpoint_province = $19, airline = $20, entry_date = $21,
                receiving_channel = $22, pjv_file_url = $23, victim_classification = $24,
                human_trafficking_type = $25, action_taken = $26
        `;
        let caseParams = [
            parseMissingDate, missing_time, detected_location_details,
            detected_location_sub_district, detected_location_district, detected_location_province, getRegionFromProvince(detected_location_province),
            incident_summary, human_trafficking_indicators, notes,
            case_number, pjv_number, agency_id, operation_result,
            parseFoundDate, parseReportedDate, relationship,
            entry_channel, entry_checkpoint_province, airline, parseEntryDate,
            receiving_channel, drivePjvUrl, victim_classification,
            human_trafficking_type, action_taken
        ];

        let paramIndex = 27;
        if (drivePhotoUrl) {
            caseUpdateQuery += `, photo_url = $${paramIndex++}`;
            caseParams.push(drivePhotoUrl);
        }
        if (drivePassportUrl) {
            caseUpdateQuery += `, passport_photo_url = $${paramIndex++}`;
            caseParams.push(drivePassportUrl);
        }
        
        caseUpdateQuery += ` WHERE case_id = $${paramIndex}`;
        caseParams.push(case_id);

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

export { 
    fetchMissingPersons,
    createMissingPersonRecord,
    fetchMissingPersonById,
    updateMissingPersonRecord,
    removeMissingPerson
 };
