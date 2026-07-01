const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const pool = require("../config/db");
const { processName, normalizeNationality, determineGender } = require("../utils/missingHelpers");
const { 
    splitThaiAddress, 
    validateLen, 
    formatExcelDate, 
    formatExcelTime, 
    parseDateForDB, 
    uploadWithRetry, 
    downloadImageToBuffer, 
    getVal,
    limitConcurrency
} = require("../utils/uploadHelpers");
const cache = require("../utils/cache");

const processUploadMissingExcel = async (fileBuffer, action, jobId) => {
    const workbookXlsx = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbookXlsx.SheetNames[0];
    let rawData = xlsx.utils.sheet_to_json(workbookXlsx.Sheets[sheetName], { defval: null });

    const workbookExt = new ExcelJS.Workbook();
    await workbookExt.xlsx.load(fileBuffer);
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

    let filteredData = rawData.filter(row => {
        const rawMissingName = getVal(row, ["ชื่อบุคคลสูญหาย", "ชื่อ - สกุล ผู้สูญหาย"]) || "";
        const rawReporterName = getVal(row, ["ผู้แจ้ง", "ชื่อ - สกุล ผู้แจ้ง"]) || "";
        const parsedMissing = processName(rawMissingName);
        const parsedReporter = processName(rawReporterName);
        return parsedMissing.hasName || parsedReporter.hasName;
    });

    // แยกคนกรณีเจอคำว่า "และ"
    let splitData = [];
    for (let row of filteredData) {
        const rawMissingName = String(getVal(row, ["ชื่อบุคคลสูญหาย", "ชื่อ - สกุล ผู้สูญหาย"]) || "");
        if (rawMissingName.includes(" และ ") || rawMissingName.includes("และ")) {
            const names = rawMissingName.split(/\s*และ\s*/).filter(n => n.trim() !== "");
            for (let i = 0; i < names.length; i++) {
                let newRow = { ...row };
                
                const nameKey = Object.keys(newRow).find(k => k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "ชื่อบุคคลสูญหาย" || k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "ชื่อ-สกุลผู้สูญหาย");
                if (nameKey) newRow[nameKey] = names[i].trim();

                const ageKey = Object.keys(newRow).find(k => k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "อายุ");
                if (ageKey) {
                    const valStr = String(newRow[ageKey] || "");
                    const parts = valStr.split(/\s*และ\s*|\s*\/\s*|\s*,\s*/).filter(p => p.trim() !== "");
                    if (parts.length > 1) newRow[ageKey] = parts[i] || parts[0];
                }

                const genderKey = Object.keys(newRow).find(k => k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "เพศ" || k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "gender");
                if (genderKey) {
                    const valStr = String(newRow[genderKey] || "");
                    const parts = valStr.split(/\s*และ\s*|\s*\/\s*|\s*,\s*/).filter(p => p.trim() !== "");
                    if (parts.length > 1) newRow[genderKey] = parts[i] || parts[0];
                }

                const idKey = Object.keys(newRow).find(k => k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "เลขประจำตัวประชาชน/เลขหนังสือเดินทางผู้สูญหาย" || k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "เลขประจำตัวประชาชนผู้สูญหาย");
                if (idKey) {
                    const valStr = String(newRow[idKey] || "");
                    const parts = valStr.split(/\s*และ\s*|\s*\/\s*|\s*,\s*/).filter(p => p.trim() !== "");
                    if (parts.length > 1) newRow[idKey] = parts[i] || parts[0];
                }

                const passKey = Object.keys(newRow).find(k => k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '') === "หมายเลขหนังสือเดินทาง");
                if (passKey) {
                    const valStr = String(newRow[passKey] || "");
                    const parts = valStr.split(/\s*และ\s*|\s*\/\s*|\s*,\s*/).filter(p => p.trim() !== "");
                    if (parts.length > 1) newRow[passKey] = parts[i] || parts[0];
                }

                splitData.push(newRow);
            }
        } else {
            splitData.push(row);
        }
    }
    
    rawData = splitData;

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

        const rawMissingName = getVal(row, ["ชื่อบุคคลสูญหาย", "ชื่อ - สกุล ผู้สูญหาย"]) || "";
        const rawReporterName = getVal(row, ["ผู้แจ้ง", "ชื่อ - สกุล ผู้แจ้ง"]) || "";
        const parsedMissing = processName(rawMissingName);
        const parsedReporter = processName(rawReporterName);
        const parsedLocation = splitThaiAddress(getVal(row, ["สถานที่สูญหาย หรือ คาดว่าสูญหาย", "สถานที่สูญหาย", "จุดที่พบเห็นครั้งสุดท้าย/จังหวัดที่เดินทางออก", "จุดที่พบเห็นครั้งสุดท้าย"]) || "");

        const missing_first_name_th = (parsedMissing.hasName && parsedMissing.isThai && parsedMissing.fname) ? parsedMissing.fname.trim() : "ไม่ระบุ";
        const missing_middle_name_th = (parsedMissing.isThai && parsedMissing.mname) ? parsedMissing.mname.trim() : null;
        const missing_last_name_th = (parsedMissing.hasName && parsedMissing.isThai && parsedMissing.lname) ? parsedMissing.lname.trim() : "ไม่ระบุ";
        const missing_first_name_en = (parsedMissing.hasName && !parsedMissing.isThai && parsedMissing.fname) ? parsedMissing.fname.trim() : null;
        const missing_middle_name_en = (!parsedMissing.isThai && parsedMissing.mname) ? parsedMissing.mname.trim() : null;
        const missing_last_name_en = (parsedMissing.hasName && !parsedMissing.isThai && parsedMissing.lname) ? parsedMissing.lname.trim() : null;

        const reporter_first_name_th = (parsedReporter.hasName && parsedReporter.isThai && parsedReporter.fname) ? parsedReporter.fname.trim() : "ไม่ระบุ";
        const reporter_middle_name_th = (parsedReporter.isThai && parsedReporter.mname) ? parsedReporter.mname.trim() : null;
        const reporter_last_name_th = (parsedReporter.hasName && parsedReporter.isThai && parsedReporter.lname) ? parsedReporter.lname.trim() : "ไม่ระบุ";
        const reporter_first_name_en = (parsedReporter.hasName && !parsedReporter.isThai && parsedReporter.fname) ? parsedReporter.fname.trim() : null;
        const reporter_middle_name_en = (!parsedReporter.isThai && parsedReporter.mname) ? parsedReporter.mname.trim() : null;
        const reporter_last_name_en = (parsedReporter.hasName && !parsedReporter.isThai && parsedReporter.lname) ? parsedReporter.lname.trim() : null;

        const mappedRow = {
            row_index: i + 1,
            report_date: formatExcelDate(getVal(row, ["วัน/เดือน/ปี ที่รับแจ้ง", "วันที่รับแจ้งวาม", "วันที่รับแจ้ง"])),
            report_channel: getVal(row, ["ช่องทางการรับแจ้ง"]),
            case_no: getVal(row, ["เลขคดี", "เลขคดีที่"]), 
            pjv_number: getVal(row, ["เลข ปจว. ที่", "เลข ปจว."]),
            pjv_file_url: getVal(row, ["อัพโหลด ปจว. รับแจ้งเหตุฯ (ถ้ามี) - PDF file หรือ ภาพถ่าย", "อัพโหลด ปจว."]),
            reporter_first_name_th,
            reporter_middle_name_th,
            reporter_last_name_th,
            reporter_first_name_en,
            reporter_middle_name_en,
            reporter_last_name_en,
            reporter_id_card: getVal(row, ["เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้แจ้ง", "เลขประจำตัวประชาชนผู้แจ้ง"]),
            reporter_phone: getVal(row, ["เบอร์โทรศัพท์ ผู้แจ้ง", "เบอร์โทรศัพท์ผู้แจ้ง"]),
            reporter_email: getVal(row, ["อีเมล ผู้แจ้ง", "อีเมลผู้แจ้ง"]),
            reporter_contact: getVal(row, ["ช่องทางการติดต่อของผู้แจ้ง"]), 
            reporter_date_of_birth: formatExcelDate(getVal(row, ["วันเกิดผู้แจ้ง", "วันเกิด (ผู้แจ้ง)"])),
            reporter_age: getVal(row, ["อายุผู้แจ้ง", "อายุ (ผู้แจ้ง)"]),
            reporter_gender: getVal(row, ["เพศผู้แจ้ง", "เพศ (ผู้แจ้ง)"]),
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
            missing_first_name_th,
            missing_middle_name_th,
            missing_last_name_th,
            missing_first_name_en,
            missing_middle_name_en,
            missing_last_name_en,
            missing_id_card: getVal(row, ["เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้สูญหาย", "เลขประจำตัวประชาชนผู้สูญหาย"]),
            date_of_birth: formatExcelDate(getVal(row, ["วันเกิด", "วัน/เดือน/ปีเกิด", "วันเกิดผู้สูญหาย"])),
            age: getVal(row, ["อายุ", "อายุ (ปี)"]),
            gender: determineGender(row, parsedMissing.prefix) || getVal(row, ["เพศ"]),
            nationality: normalizeNationality(getVal(row, ["สัญชาติ", "สัญชาติของผู้สูญหาย"])),
            passport_id: getVal(row, ["หมายเลขหนังสือเดินทาง"]),
            missing_date: formatExcelDate(getVal(row, ["วันที่สูญหาย หรือ คาดว่าสูญหาย", "วันที่หาย", "วันที่พบเห็นครั้งสุดท้าย"])),
            missing_time: formatExcelTime(getVal(row, ["เวลาสูญหาย หรือ คาดว่าสูญหาย", "เวลาสูญหาย"])),
            detected_location_details: parsedLocation.details,
            detected_location_sub_district: parsedLocation.sub_district,
            detected_location_district: parsedLocation.district,
            detected_location_province: parsedLocation.province,
            entry_channel: getVal(row, ["ช่องทางที่เดินทางเข้ามาในราชอาณาจักร"]),
            entry_checkpoint: getVal(row, ["ชื่อด่านและจังหวัดที่เดินทางเข้า"]),
            airline: getVal(row, ["สายการบิน (ถ้ามี)"]),
            entry_date: formatExcelDate(getVal(row, ["วันที่เดินทางเข้า"])),
            photo_url: photo_url_preview,
            _imageData: row._image,
            _original_photo_url: getVal(row, ["รูปภาพ"]),
            circumstances: getVal(row, ["พฤติการณ์", "พฤติการณ์โดยสังเขป"]),
            human_trafficking_indicator: (() => {
                const val = (getVal(row, ["ข้อบ่งชี้ค้ามนุษย์"]) || "").toString().trim();
                if (val.includes("ไม่มี") || val === "ไม่" || val.toLowerCase() === "no" || val.toLowerCase() === "false") return false;
                if (val.includes("มี") || val.toLowerCase() === "yes" || val.toLowerCase() === "true") return true;
                return false;
            })(),
            victim_screening: getVal(row, ["การคัดแยกเหยื่อ"]),
            trafficking_type: getVal(row, ["ประเภทของการค้ามนุษย์"]),
            action_taken: getVal(row, ["การดำเนินการ"]),
            operation_result: (() => {
                const val = (getVal(row, ["ผลการปฏิบัติ"]) || "").toString().trim();
                if (val.includes("พบตัว") && !val.includes("ไม่พบตัว")) return true;
                return false;
            })(),
            found_date: formatExcelDate(getVal(row, ["วันที่พบตัว"])),
            note: getVal(row, ["หมายเหตุ"]),
            raw_data_from_excel: row
        };

        mappedData.push(mappedRow);
    }

    if (action === "preview") {
        return { action: "preview", total_rows: mappedData.length, preview_data: mappedData };
    }

    let successCount = 0;
    let errors = [];
    if (jobId) global.uploadProgress[jobId] = { current: 0, total: mappedData.length, status: 'processing' };

    let currentProgress = 0;

    // 1. Google Drive Uploads (Concurrency 20)
    const driveTasks = mappedData.map((mappedRow, idx) => {
        return async () => {
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
                    errors.push(`แถวที่ ${idx + 1}: อัปโหลดรูปภาพไม่สำเร็จ (${e.message})`);
                }
            } else if (mappedRow._original_photo_url) {
                drivePhotoUrl = mappedRow._original_photo_url;
            }

            mappedRow.drivePhotoUrl = drivePhotoUrl;
            
            currentProgress++;
            if (jobId && global.uploadProgress[jobId]) {
                // ให้ Drive upload คิดเป็น 50% ของ Progress
                global.uploadProgress[jobId].current = Math.round((currentProgress / mappedData.length) * (mappedData.length * 0.5));
            }
        };
    });

    await limitConcurrency(driveTasks, 20);

    // 2. Database Inserts (Concurrency 15)
    let dbProgress = 0;
    const dbTasks = mappedData.map((mappedRow, idx) => {
        return async () => {
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

                let informantDob = mappedRow.reporter_date_of_birth ? parseDateForDB(mappedRow.reporter_date_of_birth) : null;
                if (!informantDob && mappedRow.reporter_age) {
                    let rAgeInt = parseInt(mappedRow.reporter_age);
                    if (!isNaN(rAgeInt)) {
                        informantDob = `${new Date().getFullYear() - rAgeInt}-01-01`;
                    }
                }

                let informantQuery = `
                    INSERT INTO informants (first_name_th, middle_name_th, last_name_th, first_name_en, middle_name_en, last_name_en, informant_contact_channel, informant_id_card_passport, informant_phone, informant_email, date_of_birth, gender) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING informant_id
                `;
                let informantRes = await client.query(informantQuery, [
                    validateLen(mappedRow.reporter_first_name_th || 'ไม่ระบุ', 255),
                    validateLen(mappedRow.reporter_middle_name_th, 255),
                    validateLen(mappedRow.reporter_last_name_th || 'ไม่ระบุ', 255),
                    validateLen(mappedRow.reporter_first_name_en, 255),
                    validateLen(mappedRow.reporter_middle_name_en, 255),
                    validateLen(mappedRow.reporter_last_name_en, 255),
                    mappedRow.reporter_contact, 
                    validateLen(mappedRow.reporter_id_card, 50), 
                    validateLen(mappedRow.reporter_phone, 50), 
                    validateLen(mappedRow.reporter_email, 100),
                    informantDob,
                    validateLen(mappedRow.reporter_gender, 50)
                ]);
                let informant_id = informantRes.rows[0].informant_id;

                let missingDob = mappedRow.date_of_birth ? parseDateForDB(mappedRow.date_of_birth) : null;
                let ageInt = parseInt(mappedRow.age);
                if (!missingDob && !isNaN(ageInt)) {
                    missingDob = `${new Date().getFullYear() - ageInt}-01-01`;
                }

                let missingQuery = `
                    INSERT INTO missing_persons (first_name_th, middle_name_th, last_name_th, first_name_en, middle_name_en, last_name_en, date_of_birth, gender, nationality, passport_number, missing_id_card_passport) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING missing_person_id
                `;
                let missingRes = await client.query(missingQuery, [
                    validateLen(mappedRow.missing_first_name_th || 'ไม่ระบุ', 255),
                    validateLen(mappedRow.missing_middle_name_th, 255),
                    validateLen(mappedRow.missing_last_name_th || 'ไม่ระบุ', 255),
                    validateLen(mappedRow.missing_first_name_en, 255),
                    validateLen(mappedRow.missing_middle_name_en, 255),
                    validateLen(mappedRow.missing_last_name_en, 255),
                    missingDob, 
                    validateLen(mappedRow.gender, 50), validateLen(mappedRow.nationality, 100), 
                    validateLen(mappedRow.passport_id, 50), validateLen(mappedRow.missing_id_card, 50)
                ]);
                let missing_person_id = missingRes.rows[0].missing_person_id;

                let caseQuery = `
                    INSERT INTO cases (
                        agency_id, informant_id, missing_person_id, relationship,
                        entry_channel, entry_checkpoint_province, airline, entry_date, 
                        detected_location_details, detected_location_sub_district, detected_location_district, detected_location_province, photo_url,
                        reported_date, receiving_channel, incident_summary, case_number, 
                        human_trafficking_indicators, victim_classification, human_trafficking_type, 
                        action_taken, operation_result, found_date, notes, police_station,
                        investigating_officer, missing_date, missing_time, pjv_number, pjv_file_url
                    ) VALUES (
                        $1, $2, $3, $4, 
                        $5, $6, $7, $8, 
                        $9, $10, $11, $12, $13, 
                        $14, $15, $16, $17, 
                        $18, $19, $20, 
                        $21, $22, $23, $24, $25, 
                        $26, $27, $28, $29, $30
                    )
                `;
                
                await client.query(caseQuery, [
                    agency_id, informant_id, missing_person_id, validateLen(mappedRow.relationship, 100),
                    validateLen(mappedRow.entry_channel, 255), validateLen(mappedRow.entry_checkpoint, 255), 
                    validateLen(mappedRow.airline, 100), parseDateForDB(mappedRow.entry_date),
                    mappedRow.detected_location_details, mappedRow.detected_location_sub_district, mappedRow.detected_location_district, mappedRow.detected_location_province, mappedRow.drivePhotoUrl,
                    parseDateForDB(mappedRow.report_date), validateLen(mappedRow.report_channel, 255), 
                    mappedRow.circumstances, validateLen(mappedRow.case_no, 100), 
                    mappedRow.human_trafficking_indicator, mappedRow.victim_screening, validateLen(mappedRow.trafficking_type, 255),
                    mappedRow.action_taken, mappedRow.operation_result, parseDateForDB(mappedRow.found_date), 
                    mappedRow.note, validateLen(stationCombined, 255),
                    validateLen(mappedRow.investigator, 255), parseDateForDB(mappedRow.missing_date), mappedRow.missing_time, 
                    validateLen(mappedRow.pjv_number, 100), mappedRow.pjv_file_url
                ]);

                await client.query('COMMIT');
                
                successCount++;
            } catch (dbErr) {
                await client.query('ROLLBACK');
                console.error(`[DB Error Row ${idx+1}]:`, dbErr.message);
                errors.push(`แถวที่ ${idx + 1}: ${dbErr.message}`);
            } finally {
                client.release();
            }
            
            dbProgress++;
            if (jobId && global.uploadProgress[jobId]) {
                global.uploadProgress[jobId].current = Math.round(((mappedData.length * 0.5) + (dbProgress / mappedData.length) * (mappedData.length * 0.5)));
            }
        };
    });

    await limitConcurrency(dbTasks, 15);

    if (successCount > 0) {
        cache.clear();
    }

    if (jobId && global.uploadProgress[jobId]) global.uploadProgress[jobId].status = 'completed';

    return { action: "upload", successCount, totalLength: mappedData.length, errors };
};

module.exports = {
    processUploadMissingExcel
};
