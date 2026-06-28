const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { uploadToDrive } = require("../services/googleDriveService"); 

if (!global.uploadProgress) { global.uploadProgress = {}; }

// ฟังก์ชันตรวจสอบความยาว: ถ้าข้อความยาวเกิน maxLen ให้กลายเป็น null ทันที
const validateLen = (val, maxLen) => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    // ถ้าความยาวเกินกำหนด ให้คืนค่า null ทิ้งไปเลย เพื่อไม่ให้ DB พัง
    return str.length > maxLen ? null : str;
};

const formatExcelDate = (val) => {
    if (val === null || val === undefined || val === '') return null;
    let num = Number(val);
    if (!isNaN(num) && num > 1000 && num < 100000) { 
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }
    return String(val).trim();
};

const formatExcelTime = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') {
        let totalSeconds = Math.round(val * 86400);
        let hours = Math.floor(totalSeconds / 3600);
        let minutes = Math.floor((totalSeconds % 3600) / 60);
        let seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return String(val).trim();
};

// ฟังก์ชันกรองวันที่ หากค่าผิดปกติ (ปีเกิน, format มั่ว) ให้กลายเป็น null
const parseDateForDB = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (!str || str === "-" || str === "ไม่ระบุ" || str.toLowerCase() === "n/a") return null;
    
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        let month = parseInt(parts[1], 10);
        let day = parseInt(parts[0], 10);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
        
        if (String(parts[0]).length === 4) {
            year = parseInt(parts[0], 10);
            day = parseInt(parts[2], 10);
        } else if (year < 100) {
            year += (year > 50 ? 2500 : 2000); 
        }
        
        if (year > 2400) year -= 543; 
        
        // เช็คความสมเหตุสมผลของวันที่ ถ้าไม่อยู่ในขอบเขตปกติให้เป็น null
        if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }
        
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        if (y < 1900 || y > 2100) return null; 
        return d.toISOString().split('T')[0];
    }
    
    return null;
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const uploadWithRetry = async (fileObj, folderId, maxRetries = 5) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await uploadToDrive(fileObj, folderId);
        } catch (error) {
            if (attempt === maxRetries) {
                throw new Error(`อัปโหลดล้มเหลวหลังจากพยายาม ${maxRetries} ครั้ง (${error.message})`);
            }
            await delay(attempt * 2000); 
        }
    }
};

const downloadImageToBuffer = async (url) => {
    if (!url) return null;
    let targetUrl = url;
    const match = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
    if (match) {
        const driveId = match[1];
        targetUrl = `https://drive.google.com/uc?id=${driveId}&export=download`;
    }

    try {
        const response = await fetch(targetUrl);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return { buffer: Buffer.from(arrayBuffer), extension: 'jpeg' };
    } catch (e) {
        return null;
    }
};

const getVal = (row, possibleKeys) => {
    const cleanPossibleKeys = possibleKeys.map(k => k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, ''));
    for (let key of Object.keys(row)) {
        const cleanKey = key.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '');
        if (cleanPossibleKeys.includes(cleanKey)) {
            const value = row[key];
            if (value !== null && value !== undefined && String(value).trim() !== '') return value;
        }
    }
    return null;
};

exports.getUploadProgress = (req, res) => {
    const jobId = req.params.jobId;
    res.json(global.uploadProgress[jobId] || { current: 0, total: 0, status: 'pending' });
};

exports.uploadMissingExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: "กรุณาแนบไฟล์ Excel" });

        const action = req.query.action || "upload";
        const jobId = req.query.jobId;

        const workbookXlsx = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbookXlsx.SheetNames[0];
        let rawData = xlsx.utils.sheet_to_json(workbookXlsx.Sheets[sheetName], { defval: null });

        const workbookExt = new ExcelJS.Workbook();
        await workbookExt.xlsx.load(req.file.buffer);
        const worksheetExt = workbookExt.worksheets[0];

        const imagesMap = {};
        for (const image of worksheetExt.getImages()) {
            const rowIdx = image.range.tl.nativeRow; 
            const imgInfo = workbookExt.getImage(image.imageId);
            if (imgInfo && imgInfo.buffer) {
                imagesMap[rowIdx] = { buffer: imgInfo.buffer, extension: imgInfo.extension || 'jpeg' };
            }
        }

        for (let i = 0; i < rawData.length; i++) {
            rawData[i]._image = imagesMap[i + 1] || null;
        }

        rawData = rawData.filter(row => 
            getVal(row, ["ผู้แจ้ง", "ชื่อ - สกุล ผู้แจ้ง"]) || 
            getVal(row, ["ชื่อบุคคลสูญหาย", "ชื่อ - สกุล ผู้สูญหาย"])
        );

        const mappedData = [];

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            
            let photo_url_preview = null;
            if (row._image) {
                const base64Data = row._image.buffer.toString('base64');
                const mimeType = row._image.extension === 'png' ? 'image/png' : 'image/jpeg';
                photo_url_preview = `data:${mimeType};base64,${base64Data}`;
            } else if (getVal(row, ["รูปภาพ"])) {
                photo_url_preview = getVal(row, ["รูปภาพ"]);
            }

            const mappedRow = {
                row_index: i + 1,
                report_date: formatExcelDate(getVal(row, ["วัน/เดือน/ปี ที่รับแจ้ง", "วันที่รับแจ้งวาม", "วันที่รับแจ้ง"])),
                report_channel: getVal(row, ["ช่องทางการรับแจ้ง"]),
                case_no: getVal(row, ["เลขคดี", "เลขคดีที่"]), 
                pjv_number: getVal(row, ["เลข ปจว. ที่", "เลข ปจว."]),
                pjv_file_url: getVal(row, ["อัพโหลด ปจว. รับแจ้งเหตุฯ (ถ้ามี) - PDF file หรือ ภาพถ่าย", "อัพโหลด ปจว."]),
                reporter_name: getVal(row, ["ผู้แจ้ง", "ชื่อ - สกุล ผู้แจ้ง"]),
                reporter_id_card: getVal(row, ["เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้แจ้ง", "เลขประจำตัวประชาชนผู้แจ้ง"]),
                reporter_phone: getVal(row, ["เบอร์โทรศัพท์ ผู้แจ้ง", "เบอร์โทรศัพท์ผู้แจ้ง"]),
                reporter_email: getVal(row, ["อีเมล ผู้แจ้ง", "อีเมลผู้แจ้ง"]),
                reporter_contact: getVal(row, ["ช่องทางการติดต่อของผู้แจ้ง"]), 
                relationship: getVal(row, ["ความสัมพันธ์"]),
                police_receiver: getVal(row, ["เจ้าหน้าที่ตำรวจผู้รับแจ้ง"]),
                police_station: getVal(row, ["สถานีตำรวจ", "สถานีตำรวจภูธร", "สถานีตำรวจนครบาล", "สถานีตำรวจ "]),
                police_substation: getVal(row, ["สังกัด สน./สภ.", "สน./สภ.", "สน/สภ", "สน.", "สภ."]),
                investigator: getVal(row, ["พนักงานสอบสวนผู้รับผิดชอบ"]),
                police_command: getVal(row, ["กองบัญชาการที่รับแจ้ง", "1. กรุณาเลือก กองบัญชาการ (บช.)", "กรุณาเลือก กองบัญชาการ (บช.)"]),
                division_1: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.)", "กองบังคับการ (บก.)"]),
                division_2: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 2"]),
                division_3: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 3"]),
                division_4: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 4"]),
                division_5: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 5"]),
                division_6: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 6"]),
                division_7: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 7"]),
                division_8: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 8"]),
                division_9: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 9"]),
                division_10: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 10"]),
                division_11: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 11"]),
                division_12: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 12"]),
                division_13: getVal(row, ["กรุณาเลือก กองบังคับการ (บก.) 13"]),
                missing_person_name: getVal(row, ["ชื่อบุคคลสูญหาย", "ชื่อ - สกุล ผู้สูญหาย"]),
                missing_id_card: getVal(row, ["เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้สูญหาย", "เลขประจำตัวประชาชนผู้สูญหาย"]),
                age: getVal(row, ["อายุ"]),
                gender: getVal(row, ["เพศ"]),
                nationality: getVal(row, ["สัญชาติ", "สัญชาติของผู้สูญหาย"]),
                passport_id: getVal(row, ["หมายเลขหนังสือเดินทาง"]),
                missing_date: formatExcelDate(getVal(row, ["วันที่สูญหาย หรือ คาดว่าสูญหาย", "วันที่หาย"])),
                missing_time: formatExcelTime(getVal(row, ["เวลาสูญหาย หรือ คาดว่าสูญหาย", "เวลาสูญหาย"])),
                missing_location: getVal(row, ["สถานที่สูญหาย หรือ คาดว่าสูญหาย", "สถานที่สูญหาย"]),
                entry_channel: getVal(row, ["ช่องทางที่เดินทางเข้ามาในราชอาณาจักร"]),
                entry_checkpoint: getVal(row, ["ชื่อด่านและจังหวัดที่เดินทางเข้า"]),
                airline: getVal(row, ["สายการบิน (ถ้ามี)"]),
                entry_date: formatExcelDate(getVal(row, ["วันที่เดินทางเข้า"])),
                last_seen_location: getVal(row, ["จุดที่พบเห็นครั้งสุดท้าย/จังหวัดที่เดินทางออก"]),
                last_seen_date: formatExcelDate(getVal(row, ["วันที่พบเห็นครั้งสุดท้าย"])),
                photo_url: photo_url_preview,
                _imageData: row._image,
                _original_photo_url: getVal(row, ["รูปภาพ"]),
                circumstances: getVal(row, ["พฤติการณ์", "พฤติการณ์โดยสังเขป"]),
                human_trafficking_indicator: getVal(row, ["ข้อบ่งชี้ค้ามนุษย์"]),
                victim_screening: getVal(row, ["การคัดแยกเหยื่อ"]),
                trafficking_type: getVal(row, ["ประเภทของการค้ามนุษย์"]),
                action_taken: getVal(row, ["การดำเนินการ"]),
                operation_result: getVal(row, ["ผลการปฏิบัติ"]),
                found_date: formatExcelDate(getVal(row, ["วันที่พบตัว"])),
                note: getVal(row, ["หมายเหตุ"]),
                raw_data_from_excel: row
            };

            mappedData.push(mappedRow);
        }

        if (action === "preview") {
            return res.status(200).json({ success: true, message: "ดึงข้อมูลพรีวิวสำเร็จ", total_rows: mappedData.length, preview_data: mappedData });
        }

        let successCount = 0;
        let errors = [];
        if (jobId) global.uploadProgress[jobId] = { current: 0, total: mappedData.length, status: 'processing' };

        for (let i = 0; i < mappedData.length; i++) {
            const mappedRow = mappedData[i];
            
            let drivePhotoUrl = null;
            let imageToUpload = mappedRow._imageData;

            if (!imageToUpload && mappedRow._original_photo_url) {
                imageToUpload = await downloadImageToBuffer(mappedRow._original_photo_url);
            }

            if (imageToUpload) {
                try {
                    const tempFileName = `missing_${Date.now()}_${Math.floor(Math.random() * 1000)}.${imageToUpload.extension || 'jpeg'}`;
                    const driveResult = await uploadWithRetry({ 
                        originalname: tempFileName, 
                        mimetype: `image/${imageToUpload.extension || 'jpeg'}`, 
                        buffer: imageToUpload.buffer 
                    }, process.env.GOOGLE_DRIVE_FOLDER_ID);
                    if (driveResult && driveResult.webViewLink) {
                        drivePhotoUrl = driveResult.webViewLink; 
                    }
                } catch (e) { 
                    errors.push(`แถวที่ ${i + 1}: อัปโหลดรูปภาพไม่สำเร็จ (${e.message})`);
                }
            } else if (mappedRow._original_photo_url) {
                drivePhotoUrl = mappedRow._original_photo_url;
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                let stationCombined = [mappedRow.police_station, mappedRow.police_substation].filter(Boolean).join(' ') || null;
                let agency_id;

                let agencyCheckQuery = `
                    SELECT agency_id FROM agencies 
                    WHERE command_center IS NOT DISTINCT FROM $1 
                      AND station IS NOT DISTINCT FROM $2 
                      AND receiving_officer IS NOT DISTINCT FROM $3
                `;
                
                // ใช้ validateLen เช็คความยาวก่อนลง DB ถ้าเกินจะเป็น null ทันที
                let agencyCheckRes = await client.query(agencyCheckQuery, [
                    validateLen(mappedRow.police_command, 255), 
                    validateLen(stationCombined, 255), 
                    validateLen(mappedRow.police_receiver, 255)
                ]);
                
                if (agencyCheckRes.rows.length > 0) {
                    agency_id = agencyCheckRes.rows[0].agency_id;
                } else {
                    let agencyQuery = `
                        INSERT INTO agencies (
                            command_center, station, receiving_officer,
                            division_1, division_2, division_3, division_4, division_5,
                            division_6, division_7, division_8, division_9, division_10,
                            division_11, division_12, division_13
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
                        RETURNING agency_id
                    `;
                    let agencyRes = await client.query(agencyQuery, [
                        validateLen(mappedRow.police_command, 255), validateLen(stationCombined, 255), validateLen(mappedRow.police_receiver, 255),
                        validateLen(mappedRow.division_1, 255), validateLen(mappedRow.division_2, 255), validateLen(mappedRow.division_3, 255), 
                        validateLen(mappedRow.division_4, 255), validateLen(mappedRow.division_5, 255), validateLen(mappedRow.division_6, 255), 
                        validateLen(mappedRow.division_7, 255), validateLen(mappedRow.division_8, 255), validateLen(mappedRow.division_9, 255), 
                        validateLen(mappedRow.division_10, 255), validateLen(mappedRow.division_11, 255), validateLen(mappedRow.division_12, 255), 
                        validateLen(mappedRow.division_13, 255)
                    ]);
                    agency_id = agencyRes.rows[0].agency_id;
                }

                // 2. ตาราง informants 
                let informantQuery = `
                    INSERT INTO informants (informant_name, informant_contact_channel, informant_id_card_passport, informant_phone, informant_email) 
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (informant_name) 
                    DO UPDATE SET 
                        informant_contact_channel = EXCLUDED.informant_contact_channel,
                        informant_id_card_passport = EXCLUDED.informant_id_card_passport,
                        informant_phone = EXCLUDED.informant_phone,
                        informant_email = EXCLUDED.informant_email
                    RETURNING informant_id
                `;
                let informantRes = await client.query(informantQuery, [
                    validateLen(mappedRow.reporter_name, 255), 
                    mappedRow.reporter_contact, 
                    validateLen(mappedRow.reporter_id_card, 50), 
                    validateLen(mappedRow.reporter_phone, 50), 
                    validateLen(mappedRow.reporter_email, 100)
                ]);
                let informant_id = informantRes.rows[0].informant_id;

                // 3. ตาราง missing_persons 
                let ageInt = parseInt(mappedRow.age);
                let validAge = isNaN(ageInt) ? null : ageInt;
                let missingQuery = `
                    INSERT INTO missing_persons (missing_person_name, age, gender, nationality, passport_number, missing_id_card_passport) 
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (missing_person_name) 
                    DO UPDATE SET 
                        age = EXCLUDED.age,
                        gender = EXCLUDED.gender,
                        nationality = EXCLUDED.nationality,
                        passport_number = EXCLUDED.passport_number,
                        missing_id_card_passport = EXCLUDED.missing_id_card_passport
                    RETURNING missing_person_id
                `;
                let missingRes = await client.query(missingQuery, [
                    validateLen(mappedRow.missing_person_name, 255), validAge, 
                    validateLen(mappedRow.gender, 50), validateLen(mappedRow.nationality, 100), 
                    validateLen(mappedRow.passport_id, 50), validateLen(mappedRow.missing_id_card, 50)
                ]);
                let missing_person_id = missingRes.rows[0].missing_person_id;

                // 4. ตาราง cases
                let caseQuery = `
                    INSERT INTO cases (
                        agency_id, informant_id, missing_person_id, relationship,
                        entry_channel, entry_checkpoint_province, airline, entry_date, 
                        last_seen_location_province, last_seen_date, photo_url,
                        reported_date, receiving_channel, incident_summary, case_number, 
                        human_trafficking_indicators, victim_classification, human_trafficking_type, 
                        action_taken, operation_result, found_date, notes, police_station,
                        investigating_officer, missing_date, missing_time, missing_location, pjv_number, pjv_file_url
                    ) VALUES (
                        $1, $2, $3, $4, 
                        $5, $6, $7, $8, 
                        $9, $10, $11, 
                        $12, $13, $14, $15, 
                        $16, $17, $18, 
                        $19, $20, $21, $22, $23, 
                        $24, $25, $26, $27, $28, $29
                    )
                `;
                
                await client.query(caseQuery, [
                    agency_id, informant_id, missing_person_id, validateLen(mappedRow.relationship, 100),
                    validateLen(mappedRow.entry_channel, 255), validateLen(mappedRow.entry_checkpoint, 255), 
                    validateLen(mappedRow.airline, 100), parseDateForDB(mappedRow.entry_date),
                    validateLen(mappedRow.last_seen_location, 255), parseDateForDB(mappedRow.last_seen_date), drivePhotoUrl,
                    parseDateForDB(mappedRow.report_date), validateLen(mappedRow.report_channel, 255), 
                    mappedRow.circumstances, validateLen(mappedRow.case_no, 100), 
                    mappedRow.human_trafficking_indicator, mappedRow.victim_screening, validateLen(mappedRow.trafficking_type, 255),
                    mappedRow.action_taken, mappedRow.operation_result, parseDateForDB(mappedRow.found_date), 
                    mappedRow.note, validateLen(stationCombined, 255),
                    validateLen(mappedRow.investigator, 255), parseDateForDB(mappedRow.missing_date), mappedRow.missing_time, 
                    mappedRow.missing_location, validateLen(mappedRow.pjv_number, 100), mappedRow.pjv_file_url
                ]);

                await client.query('COMMIT');
                
                successCount++;
            } catch (dbErr) {
                await client.query('ROLLBACK');
                console.error(`[DB Error Row ${i+1}]:`, dbErr.message);
                errors.push(`แถวที่ ${i + 1}: ${dbErr.message}`);
            } finally {
                client.release();
            }

            if (jobId && global.uploadProgress[jobId]) global.uploadProgress[jobId].current = i + 1;
            
            await delay(200);
        }

        if (jobId && global.uploadProgress[jobId]) global.uploadProgress[jobId].status = 'completed';

        res.status(200).json({
            success: true,
            message: `บันทึกข้อมูลสำเร็จ ${successCount} จาก ${mappedData.length} รายการ`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error("Upload Excel Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
    }
};

// ============================================================
// GET /api/v1/missing — ดึงรายการบุคคลสูญหาย (pagination, sort, search)
// ============================================================
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

        // Search filter — ค้นหาชื่อ, เลขประจำตัว, พาสปอร์ต
        if (search && search.trim()) {
            const searchTerms = search.trim().split(/\s+/);
            const searchConditions = searchTerms.map(term => {
                const likeParam = `%${term}%`;
                const condition = `(
                    mp.missing_person_name ILIKE $${paramIndex}
                    OR mp.missing_id_card_passport ILIKE $${paramIndex}
                    OR mp.passport_number ILIKE $${paramIndex}
                    OR c.missing_location ILIKE $${paramIndex}
                    OR c.police_station ILIKE $${paramIndex}
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
            const dir = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
            const sortMap = {
                name: `mp.missing_person_name ${dir} NULLS LAST`,
                missing_date: `c.missing_date ${dir} NULLS LAST`,
                missing_id_card_passport: `mp.missing_id_card_passport ${dir} NULLS LAST`,
                missing_location: `c.missing_location ${dir} NULLS LAST`,
            };
            if (sortMap[sortBy]) {
                orderClause = `ORDER BY ${sortMap[sortBy]}, mp.missing_person_id DESC`;
            }
        }

        // Main data query
        const dataQuery = `
            SELECT
                mp.missing_person_id,
                mp.missing_person_name,
                mp.age,
                mp.gender,
                mp.nationality,
                mp.passport_number,
                mp.missing_id_card_passport,
                c.case_id,
                c.missing_date,
                c.missing_time,
                c.missing_location,
                c.last_seen_location_province,
                c.photo_url,
                c.found_date,
                c.reported_date,
                c.case_number,
                c.operation_result,
                c.police_station,
                c.incident_summary,
                c.notes
            FROM missing_persons mp
            LEFT JOIN cases c ON mp.missing_person_id = c.missing_person_id
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
            missing_person_name,
            age,
            gender,
            nationality,
            passport_number,
            missing_id_card_passport,
            missing_date,
            missing_time,
            missing_location,
            last_seen_location_province,
            incident_summary,
            informant_name,
            police_station,
            human_trafficking_indicators,
            notes,
        } = req.body;

        if (!missing_person_name || !missing_person_name.trim()) {
            return res.status(400).json({ success: false, message: "กรุณากรอกชื่อบุคคลสูญหาย" });
        }

        await client.query("BEGIN");

        // 1. Insert missing_persons
        let ageInt = parseInt(age);
        let validAge = isNaN(ageInt) ? null : ageInt;

        const missingQuery = `
            INSERT INTO missing_persons (missing_person_name, age, gender, nationality, passport_number, missing_id_card_passport)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (missing_person_name)
            DO UPDATE SET
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                nationality = EXCLUDED.nationality,
                passport_number = EXCLUDED.passport_number,
                missing_id_card_passport = EXCLUDED.missing_id_card_passport
            RETURNING missing_person_id
        `;
        const missingRes = await client.query(missingQuery, [
            validateLen(missing_person_name, 255),
            validAge,
            validateLen(gender, 50),
            validateLen(nationality, 100),
            validateLen(passport_number, 50),
            validateLen(missing_id_card_passport, 50),
        ]);
        const missing_person_id = missingRes.rows[0].missing_person_id;

        // 2. Insert informant (ถ้ามี)
        let informant_id = null;
        if (informant_name && informant_name.trim()) {
            const informantQuery = `
                INSERT INTO informants (informant_name)
                VALUES ($1)
                ON CONFLICT (informant_name) DO UPDATE SET informant_name = EXCLUDED.informant_name
                RETURNING informant_id
            `;
            const informantRes = await client.query(informantQuery, [validateLen(informant_name, 255)]);
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
                missing_date, missing_time, missing_location,
                last_seen_location_province, incident_summary,
                police_station, human_trafficking_indicators,
                notes, photo_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING case_id
        `;
        await client.query(caseQuery, [
            missing_person_id,
            informant_id,
            parseMissingDate,
            missing_time || null,
            missing_location || null,
            last_seen_location_province || null,
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
                mp.missing_person_name,
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
                c.last_seen_location_province,
                c.last_seen_date,
                c.missing_date,
                c.missing_time,
                c.missing_location,
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
                i.informant_name,
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