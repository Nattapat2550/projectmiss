const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { uploadToDrive } = require("../services/googleDriveService"); 

if (!global.uploadProgress) { global.uploadProgress = {}; }

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

const parseDateForDB = (dateStr) => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (str === "-" || str === "ไม่ระบุ" || str.toLowerCase() === "n/a") return null;
    
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        let month = parseInt(parts[1], 10);
        let day = parseInt(parts[0], 10);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
        
        // ถ้าเป็น YYYY-MM-DD หรือ YYYY/MM/DD
        if (String(parts[0]).length === 4) {
            year = parseInt(parts[0], 10);
            day = parseInt(parts[2], 10);
        }
        
        // แปลง พ.ศ. เป็น ค.ศ.
        if (year > 2400) year -= 543;
        
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
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
            console.error(`[Drive Upload Attempt ${attempt}/${maxRetries} Failed]:`, error.message);
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
        return {
            buffer: Buffer.from(arrayBuffer),
            extension: 'jpeg'
        };
    } catch (e) {
        console.error("Failed to download image from URL:", e.message);
        return null;
    }
};

// 🟢 3. ฟังก์ชันดึงค่าจาก Excel แบบฉลาด
const getVal = (row, possibleKeys) => {
    const cleanPossibleKeys = possibleKeys.map(k => 
        k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '')
    );
    
    for (let key of Object.keys(row)) {
        const cleanKey = key.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '');
        
        if (cleanPossibleKeys.includes(cleanKey)) {
            const value = row[key];
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                return value;
            }
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

        // อ่านภาพจาก Buffer ด้วย exceljs
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

        // แมปภาพเข้ากับ rawData ก่อนถูก filter
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
            
            // เตรียมข้อมูลพรีวิวรูปภาพ
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
                
                report_date: formatExcelDate(getVal(row, ["วัน/เดือน/ปี ที่รับแจ้ง", "วันที่รับแจ้งวาม"])),
                reporter_name: getVal(row, ["ผู้แจ้ง", "ชื่อ - สกุล ผู้แจ้ง"]),
                relationship: getVal(row, ["ความสัมพันธ์"]),
                reporter_contact: getVal(row, ["ช่องทางการติดต่อของผู้แจ้ง", "เบอร์โทรศัพท์ ผู้แจ้ง", "อีเมล ผู้แจ้ง"]),
                report_channel: getVal(row, ["ช่องทางการรับแจ้ง"]),
                
                police_receiver: getVal(row, ["เจ้าหน้าที่ตำรวจผู้รับแจ้ง"]),
                police_station: getVal(row, ["สถานีตำรวจ", "สถานีตำรวจภูธร", "สถานีตำรวจนครบาล"]),
                police_substation: getVal(row, ["สังกัด สน./สภ.", "สน./สภ.", "สน/สภ", "สน.", "สภ."]),
                investigator: getVal(row, ["พนักงานสอบสวนผู้รับผิดชอบ"]),
                police_command: getVal(row, ["กองบัญชาการที่รับแจ้ง", "1. กรุณาเลือก กองบัญชาการ (บช.)"]),
                
                missing_person_name: getVal(row, ["ชื่อบุคคลสูญหาย", "ชื่อ - สกุล ผู้สูญหาย"]),
                age: getVal(row, ["อายุ"]),
                gender: getVal(row, ["เพศ"]),
                nationality: getVal(row, ["สัญชาติ", "สัญชาติของผู้สูญหาย"]),
                passport_id: getVal(row, ["หมายเลขหนังสือเดินทาง", "เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้สูญหาย"]),
                
                entry_channel: getVal(row, ["ช่องทางที่เดินทางเข้ามาในราชอาณาจักร"]),
                entry_checkpoint: getVal(row, ["ชื่อด่านและจังหวัดที่เดินทางเข้า"]),
                airline: getVal(row, ["สายการบิน (ถ้ามี)"]),
                entry_date: formatExcelDate(getVal(row, ["วันที่เดินทางเข้า"])),
                last_seen_location: getVal(row, ["จุดที่พบเห็นครั้งสุดท้าย/จังหวัดที่เดินทางออก", "สถานที่สูญหาย หรือ คาดว่าสูญหาย"]),
                last_seen_date: formatExcelDate(getVal(row, ["วันที่พบเห็นครั้งสุดท้าย", "วันที่สูญหาย หรือ คาดว่าสูญหาย"])),
                
                photo_url: photo_url_preview, // ในพรีวิวจะใช้ base64, ในตอนอัปโหลดจริงจะใช้เพื่อเช็คว่ามีรูป
                _imageData: row._image, // เก็บข้อมูลภาพไว้ใช้อัปโหลดจริง
                _original_photo_url: getVal(row, ["รูปภาพ"]),
                
                human_trafficking_indicator: getVal(row, ["ข้อบ่งชี้ค้ามนุษย์"]),
                note: getVal(row, ["หมายเหตุ"]),
                action_taken: getVal(row, ["การดำเนินการ"]),
                operation_result: getVal(row, ["ผลการปฏิบัติ"]),
                found_date: formatExcelDate(getVal(row, ["วันที่พบตัว"])),
                circumstances: getVal(row, ["พฤติการณ์", "พฤติการณ์โดยสังเขป"]),
                victim_screening: getVal(row, ["การคัดแยกเหยื่อ"]),
                trafficking_type: getVal(row, ["ประเภทของการค้ามนุษย์"]),
                case_no: getVal(row, ["เลขคดี", "เลขคดีที่", "เลข ปจว. ที่"]),
                
                raw_data_from_excel: row
            };

            mappedData.push(mappedRow);
        }

        if (action === "preview") {
            return res.status(200).json({ success: true, message: "ดึงข้อมูลพรีวิวสำเร็จ", total_rows: mappedData.length, preview_data: mappedData });
        }

        // ================= โหมดอัปโหลดจริง =================
        let successCount = 0;
        let errors = [];
        if (jobId) global.uploadProgress[jobId] = { current: 0, total: mappedData.length, status: 'processing' };

        for (let i = 0; i < mappedData.length; i++) {
            const mappedRow = mappedData[i];
            
            // 1. อัปโหลดรูปภาพขึ้น Google Drive
            let drivePhotoUrl = null;
            let imageToUpload = mappedRow._imageData;

            // ถ้ารูปไม่ได้ฝังมาในเซลล์ แต่เป็นลิงก์ (เช่น Google Drive link) ให้โหลดรูปมาไว้ใน memory ก่อน
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
                    console.error("Drive Upload Final Error:", e);
                    errors.push(`แถวที่ ${i + 1}: อัปโหลดรูปภาพไม่สำเร็จ (${e.message})`);
                }
            }

            const client = await pool.connect();
            try {
                // ✅ เริ่ม Transaction
                await client.query('BEGIN');
                
                // 1. ตาราง agencies
                // แก้บัค: ใช้คอลัมน์ 'station' แทน 'police_station' ให้ตรงกับ database.sql
                let agencyQuery = `INSERT INTO agencies (command_center, station, receiving_officer, investigating_officer) VALUES ($1, $2, $3, $4) RETURNING agency_id`;
                // รวมชื่อสถานี + สน เพื่อเก็บลง DB ถ้ามี
                let stationCombined = [mappedRow.police_station, mappedRow.police_substation].filter(Boolean).join(' ') || null;
                let agencyRes = await client.query(agencyQuery, [mappedRow.police_command, stationCombined, mappedRow.police_receiver, mappedRow.investigator]);
                let agency_id = agencyRes.rows[0].agency_id;

                // 2. ตาราง informants
                let informantQuery = `INSERT INTO informants (informant_name, relationship, informant_contact_channel) VALUES ($1, $2, $3) RETURNING informant_id`;
                let informantRes = await client.query(informantQuery, [mappedRow.reporter_name, mappedRow.relationship, mappedRow.reporter_contact]);
                let informant_id = informantRes.rows[0].informant_id;

                // 3. ตาราง missing_persons
                let ageInt = parseInt(mappedRow.age);
                let validAge = isNaN(ageInt) ? null : ageInt;
                let missingQuery = `INSERT INTO missing_persons (missing_person_name, age, gender, nationality, passport_number, entry_channel, entry_checkpoint_province, airline, entry_date, last_seen_location_province, last_seen_date, photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING missing_person_id`;
                let missingRes = await client.query(missingQuery, [mappedRow.missing_person_name, validAge, mappedRow.gender, mappedRow.nationality, mappedRow.passport_id, mappedRow.entry_channel, mappedRow.entry_checkpoint, mappedRow.airline, parseDateForDB(mappedRow.entry_date), mappedRow.last_seen_location, parseDateForDB(mappedRow.last_seen_date), drivePhotoUrl]);
                let missing_person_id = missingRes.rows[0].missing_person_id;

                // 4. ตาราง cases
                // แก้บัค: เพิ่ม police_station เข้าไปใน insert ของตาราง cases ให้ครบถ้วน
                let caseQuery = `INSERT INTO cases (agency_id, informant_id, missing_person_id, reported_date, receiving_channel, incident_summary, case_number, human_trafficking_indicators, victim_classification, human_trafficking_type, action_taken, operation_result, found_date, notes, police_station) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;
                await client.query(caseQuery, [agency_id, informant_id, missing_person_id, parseDateForDB(mappedRow.report_date), mappedRow.report_channel, mappedRow.circumstances, mappedRow.case_no, mappedRow.human_trafficking_indicator, mappedRow.victim_screening, mappedRow.trafficking_type, mappedRow.action_taken, mappedRow.operation_result, parseDateForDB(mappedRow.found_date), mappedRow.note, stationCombined]);

                await client.query('COMMIT');
                
                successCount++;
            } catch (dbErr) {
                await client.query('ROLLBACK');
                console.error(`[DB Error]:`, dbErr.message);
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
            message: `บันทึกข้อมูลและดึงรูปภาพสำเร็จ ${successCount} จาก ${mappedData.length} รายการ`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error("Upload Excel Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
    }
};