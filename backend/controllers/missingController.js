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