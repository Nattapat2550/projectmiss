const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid"); 
const { uploadToDrive } = require("../services/googleDriveService"); 

// Helper functions
const removePrefix = (fullName) => {
    if (!fullName || typeof fullName !== "string") return fullName;
    const prefixRegex = /^(พล\.ต\.อ\.|พล\.ต\.ท\.|พล\.ต\.ต\.|พ\.ต\.อ\.|พ\.ต\.ท\.|พ\.ต\.ต\.|ร\.ต\.อ\.|ร\.ต\.ท\.|ร\.ต\.ต\.|ด\.ต\.|จ\.ส\.ต\.|ส\.ต\.อ\.|ส\.ต\.ท\.|ส\.ต\.ต\.|ว่าที่ ร\.ต\.|นางสาว|น\.ส\.|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นาย|นาง|Mr\.|Mrs\.|Ms\.|Miss\s*)/i;
    return fullName.replace(prefixRegex, '').trim();
};

const splitName = (fullName) => {
    if (!fullName || typeof fullName !== "string") return { first: null, middle: null, last: null };
    const nameWithoutPrefix = removePrefix(fullName);
    const parts = nameWithoutPrefix.split(/\s+/);
    
    if (parts.length === 1) return { first: parts[0], middle: null, last: null };
    if (parts.length === 2) return { first: parts[0], middle: null, last: parts[1] };
    if (parts.length >= 3) {
        const first = parts[0];
        const last = parts[parts.length - 1]; 
        const middle = parts.slice(1, parts.length - 1).join(" "); 
        return { first, middle, last };
    }
    return { first: null, middle: null, last: null };
};

const determineGenderFromName = (fullName) => {
    if (!fullName || typeof fullName !== "string") return null;
    const prefixRegex = /^(นาย|นางสาว|น\.ส\.|นาง|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.|Miss)/i;
    const match = fullName.match(prefixRegex);
    if (match) {
        const prefix = match[1].toLowerCase().replace(/\s+/g, '');
        if (["นาย", "เด็กชาย", "ด.ช.", "mr."].includes(prefix)) return "ชาย";
        if (["นาง", "นางสาว", "น.ส.", "เด็กหญิง", "ด.ญ.", "mrs.", "ms.", "miss"].includes(prefix)) return "หญิง";
    }
    return null;
};

const parseThaiDOBToDate = (dobStr) => {
    if (dobStr == null || dobStr === '') return null;
    if (typeof dobStr === 'number') return new Date(Math.round((dobStr - 25569) * 86400 * 1000));
    const str = String(dobStr).trim();
    if (str === "ไม่ระบุ" || str === "-") return null;
    const parts = str.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year > 2400) year -= 543;
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) return new Date(Date.UTC(year, month - 1, day));
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
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

if (!global.uploadProgress) { global.uploadProgress = {}; }
  
exports.getUploadProgress = (req, res) => {
    const jobId = req.params.jobId;
    res.json(global.uploadProgress[jobId] || { current: 0, total: 0, status: 'pending' });
};

exports.uploadExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: "กรุณาแนบไฟล์ Excel" });

        const action = req.query.action || "upload";
        const jobId = req.query.jobId;

        // อ่านไฟล์ Excel จาก Buffer ในหน่วยความจำโดยตรง
        const workbookXlsx = xlsx.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbookXlsx.SheetNames[0];
        let rawData = xlsx.utils.sheet_to_json(workbookXlsx.Sheets[sheetName], { defval: null });

        rawData = rawData.filter(row => {
            const thName = row["ชื่อ สกุล (ไทย)"];
            const enName = row["ชื่อ สกุล (อังกฤษ)"];
            const idCard = row["เลขประจำตัวประชาขน"] || row["เลขประจำตัวประชาชน"];
            const pass = row["เลขพาสปอร์ต"];
            return (thName && String(thName).trim() !== "") || (enName && String(enName).trim() !== "") || idCard || pass;
        });

        // ใช้ exceljs อ่านภาพจาก Buffer เช่นกัน
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

        // ================= โหมดพรีวิว =================
        if (action === "preview") {
            const preview_data = [];
            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                const rawThName = row["ชื่อ สกุล (ไทย)"];
                const rawEnName = row["ชื่อ สกุล (อังกฤษ)"];
                const thName = splitName(rawThName);
                const enName = splitName(rawEnName);
                const autoGender = determineGenderFromName(rawThName) || determineGenderFromName(rawEnName) || (row["เพศ"] ? String(row["เพศ"]).trim() : null);

                const raw_id = row["เลขประจำตัวประชาขน"] || row["เลขประจำตัวประชาชน"];
                const id_card = raw_id ? String(raw_id).replace(/[^0-9a-zA-Z]/g, '') : `NO_ID_${i}`;
                const dobDate = parseThaiDOBToDate(row["วัน/เดือน/ปี เกิด"]);
                
                let photo_url_preview = null;
                if (imagesMap[i + 1]) {
                    const base64Data = imagesMap[i + 1].buffer.toString('base64');
                    const mimeType = imagesMap[i + 1].extension === 'png' ? 'image/png' : 'image/jpeg';
                    photo_url_preview = `data:${mimeType};base64,${base64Data}`;
                } else if (row["รูปจาก ทร.14"]) {
                    photo_url_preview = String(row["รูปจาก ทร.14"]);
                }

                preview_data.push({
                    ลำดับที่อ่านได้: i + 1,
                    first_name_th: thName.first || "ไม่ระบุ",
                    last_name_th: thName.last || "ไม่ระบุ",
                    first_name_en: enName.first || null,
                    last_name_en: enName.last || null,
                    age: parseInt(row["อายุ(ปี)"]) || null,
                    dob: dobDate ? dobDate.toISOString().split('T')[0] : "ไม่ระบุ",
                    gender: autoGender,
                    id_card: id_card,
                    passport: row["เลขพาสปอร์ต"] ? String(row["เลขพาสปอร์ต"]).trim() : null,
                    photo_url: photo_url_preview,
                    case_id_count: parseInt(row["จำนวน Case ID"]) || 0,
                    warrant: parseInt(row["หมายจับ"]) || 0,
                    raw_data_from_excel: row
                });
            }
            return res.status(200).json({ success: true, message: "ดึงข้อมูลพรีวิวสำเร็จ", total_rows: preview_data.length, preview_data });
        }

        // ================= โหมดอัปโหลด =================
        let successCount = 0;
        let errors = [];
        if (jobId) global.uploadProgress[jobId] = { current: 0, total: rawData.length, status: 'processing' };

        const created_by = req.user ? req.user.id : null;

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            const rawThName = row["ชื่อ สกุล (ไทย)"];
            const rawEnName = row["ชื่อ สกุล (อังกฤษ)"];
            const thName = splitName(rawThName);
            const enName = splitName(rawEnName);
            const autoGender = determineGenderFromName(rawThName) || determineGenderFromName(rawEnName) || (row["เพศ"] ? String(row["เพศ"]).trim() : null);

            let drivePhotoUrl = null;

            if (imagesMap[i + 1]) {
                try {
                    const tempFileName = `img_${Date.now()}_${Math.floor(Math.random() * 1000)}.${imagesMap[i + 1].extension}`;
                    
                    const driveResult = await uploadWithRetry({ 
                        originalname: tempFileName, 
                        mimetype: `image/${imagesMap[i + 1].extension}`, 
                        buffer: imagesMap[i + 1].buffer 
                    }, process.env.GOOGLE_DRIVE_FOLDER_ID);
                    
                    if (driveResult && driveResult.webViewLink) {
                        drivePhotoUrl = driveResult.webViewLink; 
                    }
                } catch (e) { 
                    console.error("Drive Upload Final Error:", e);
                    errors.push(`แถวที่ ${i + 1}: อัปโหลดรูปภาพไม่สำเร็จ (${e.message})`);
                }
            } else if (row["รูปจาก ทร.14"]) {
                drivePhotoUrl = String(row["รูปจาก ทร.14"]);
            }

            const raw_id = row["เลขประจำตัวประชาขน"] || row["เลขประจำตัวประชาชน"];
            const id_card = raw_id ? String(raw_id).replace(/[^0-9a-zA-Z]/g, '') : `NO_ID_${Date.now()}_${i}`;
            
            let passport = row["เลขพาสปอร์ต"] ? String(row["เลขพาสปอร์ต"]).replace(/\s/g, '').trim() : null;
            if (passport && ["-", "ไม่มี", "ไม่ระบุ", "none", "n/a", "null", "ไม่มีหนังสือเดินทาง"].includes(passport.toLowerCase())) passport = null;

            const dobDate = parseThaiDOBToDate(row["วัน/เดือน/ปี เกิด"]);
            const caseCount = parseInt(row["จำนวน Case ID"]);
            const warrantCount = parseInt(row["หมายจับ"]);
            const parsedAge = parseInt(row["อายุ(ปี)"]);

            try {
                let existingId = null;
                if (!id_card.startsWith("NO_ID_")) {
                    const natCheck = await pool.query("SELECT id FROM deported_persons WHERE national_id = $1", [id_card]);
                    if (natCheck.rows.length > 0) existingId = natCheck.rows[0].id;
                }
                if (!existingId && passport) {
                    const passCheck = await pool.query("SELECT id FROM deported_persons WHERE passport_id = $1", [passport]);
                    if (passCheck.rows.length > 0) existingId = passCheck.rows[0].id;
                }

                const values = [
                    thName.first || "ไม่ระบุ", thName.middle || null, thName.last || "ไม่ระบุ",
                    enName.first || null, enName.middle || null, enName.last || null,
                    dobDate, autoGender, isNaN(parsedAge) ? null : parsedAge, id_card, passport,
                    row["ที่อยู่"] ? String(row["ที่อยู่"]) : "ไม่ระบุ",
                    row["ตึก ที่ทำงาน"] ? String(row["ตึก ที่ทำงาน"]) : null,
                    row["ชั้น ที่ทำงาน"] ? String(row["ชั้น ที่ทำงาน"]) : null,
                    row["ห้อง ที่ทำงาน"] ? String(row["ห้อง ที่ทำงาน"]) : null,
                    row["ประเภทงาน"] ? String(row["ประเภทงาน"]) : null,
                    row["ทำหน้าที่"] ? String(row["ทำหน้าที่"]) : null,
                    row["เงินเดือนที่ได้รับ(บาท)"] ? String(row["เงินเดือนที่ได้รับ(บาท)"]) : null,
                    row["รับเงินเดือนจากใคร"] ? String(row["รับเงินเดือนจากใคร"]) : null,
                    row["ช่องทางการรับเงินเดือน"] ? String(row["ช่องทางการรับเงินเดือน"]) : null,
                    isNaN(caseCount) ? 0 : caseCount,
                    isNaN(warrantCount) ? 0 : warrantCount,
                    row["มีข้อบ่งชี้ / ไม่มีข้อบ่งชี้ (เหยื่อ)"] ? String(row["มีข้อบ่งชี้ / ไม่มีข้อบ่งชี้ (เหยื่อ)"]) : null,
                    row["หน่วยงานที่รับผิดชอบ"] ? String(row["หน่วยงานที่รับผิดชอบ"]) : null,
                    row["หมายเหตุ"] ? String(row["หมายเหตุ"]) : null
                ];

                if (existingId) {
                    let updateQ = `UPDATE deported_persons SET 
                        first_name_th=$1, middle_name_th=$2, last_name_th=$3, first_name_en=$4, middle_name_en=$5, last_name_en=$6,
                        date_of_birth=$7, gender=$8, age=$9, national_id=$10, passport_id=$11, address=$12,
                        building=$13, floor=$14, room=$15, job_type=$16, role=$17, salary=$18, paid_by=$19, payment_method=$20,
                        number_of_case=$21, number_of_warrant=$22, victim_indicator=$23, responsible_agency=$24, note=$25, updated_at=NOW()`;
                    
                    const updateVals = [...values];
                    if (drivePhotoUrl) {
                        updateQ += `, photo_url=$26 WHERE id=$27`;
                        updateVals.push(drivePhotoUrl, existingId);
                    } else {
                        updateQ += ` WHERE id=$26`;
                        updateVals.push(existingId);
                    }
                    await pool.query(updateQ, updateVals);
                } else {
                    const insertQ = `INSERT INTO deported_persons (
                        id, first_name_th, middle_name_th, last_name_th, first_name_en, middle_name_en, last_name_en,
                        date_of_birth, gender, age, national_id, passport_id, address,
                        building, floor, room, job_type, role, salary, paid_by, payment_method,
                        number_of_case, number_of_warrant, victim_indicator, responsible_agency, note, photo_url, created_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)`;
                    await pool.query(insertQ, [uuidv4(), ...values, drivePhotoUrl || null, created_by]);
                }

                successCount++;
            } catch (dbErr) {
                errors.push(`แถวที่ ${i + 1}: ${dbErr.message}`);
            }

            if (jobId && global.uploadProgress[jobId]) global.uploadProgress[jobId].current = i + 1;
            
            await delay(200); 
        }

        if (jobId && global.uploadProgress[jobId]) global.uploadProgress[jobId].status = 'completed';

        res.status(200).json({
            success: true,
            message: `อัปโหลดและบันทึกข้อมูลสำเร็จ ${successCount} จาก ${rawData.length} รายการ`,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
    }
};