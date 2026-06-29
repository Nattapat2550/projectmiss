const xlsx = require("xlsx");
const ExcelJS = require("exceljs");
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const { uploadToDrive } = require("../services/googleDriveService");
const { safeParseDate, normalizeNationality, processName, findValue, determineGender, parseThaiDateToDate } = require("../utils/missingHelpers");

let thaiAddresses = [];
try {
    const addressPath = path.join(__dirname, '../../frontend/public/thai_addresses.json');
    thaiAddresses = JSON.parse(fs.readFileSync(addressPath, 'utf-8'));
} catch (err) {
    console.error("Could not load thai_addresses.json for address parsing", err);
}

const splitThaiAddress = (fullAddress) => {
    if (!fullAddress || typeof fullAddress !== 'string') {
        return { details: "ไม่ระบุ", sub_district: null, district: null, province: null };
    }
    
    let str = fullAddress.trim();
    let province = null, district = null, sub_district = null;
    
    // หา แขวง-เขต ที่เขียนรวมกัน
    const combinedMatch = str.match(/(?:แขวง-เขต|แขวง\/เขต|เขต\/แขวง|เขต-แขวง)\s*([^\s]+)/);
    if (combinedMatch) {
        district = combinedMatch[1];
        sub_district = combinedMatch[1];
        str = str.replace(combinedMatch[0], '').trim();
    }
    
    // หา จังหวัด
    const provMatch = str.match(/(?:จ\.| จว\.|จังหวัด)\s*([^\s]+)/) || str.match(/\s(กรุงเทพมหานคร|กรุงเทพฯ|กทม\.?|เชียงใหม่|ภูเก็ต|โคราช|ชลบุรี)$/);
    if (provMatch) {
        province = provMatch[1];
        str = str.replace(provMatch[0], '').trim();
    }
    
    // หา อำเภอ / เขต
    const distMatch = str.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s]+)/);
    if (distMatch) {
        district = distMatch[1];
        str = str.replace(distMatch[0], '').trim();
    }
    
    // หา ตำบล / แขวง
    const subMatch = str.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s]+)/);
    if (subMatch) {
        sub_district = subMatch[1];
        str = str.replace(subMatch[0], '').trim();
    }
    
    if (province) {
        let p = province.replace(/^(จังหวัด|จ\.|จว\.)/, '').trim();
        if (["กรุงเทพฯ", "กรุงเทพ", "กทม", "กทม.", "กรุงเทพมหานคร"].includes(p)) province = "กรุงเทพมหานคร";
        else if (p === "โคราช") province = "นครราชสีมา";
        else {
            const found = thaiAddresses.find(addr => addr.province.includes(p) || p.includes(addr.province));
            province = found ? found.province : p;
        }
    }
    
    if (district) {
        let d = district.replace(/^(อำเภอ|เขต|อ\.)/, '').trim();
        if (province && thaiAddresses.length > 0) {
            const found = thaiAddresses.find(addr => addr.province === province && (addr.amphoe.includes(d) || d.includes(addr.amphoe)));
            district = found ? found.amphoe : d;
        } else if (thaiAddresses.length > 0) {
            const found = thaiAddresses.find(addr => addr.amphoe.includes(d) || d.includes(addr.amphoe));
            district = found ? found.amphoe : d;
        } else district = d;
    }
    
    if (sub_district) {
        let s = sub_district.replace(/^(ตำบล|แขวง|ต\.)/, '').trim();
        if (province && district && thaiAddresses.length > 0) {
            const found = thaiAddresses.find(addr => addr.province === province && addr.amphoe === district && (addr.district.includes(s) || s.includes(addr.district)));
            sub_district = found ? found.district : s;
        } else if (province && thaiAddresses.length > 0) {
            const found = thaiAddresses.find(addr => addr.province === province && (addr.district.includes(s) || s.includes(addr.district)));
            sub_district = found ? found.district : s;
        } else if (thaiAddresses.length > 0) {
            const found = thaiAddresses.find(addr => addr.district.includes(s) || s.includes(addr.district));
            sub_district = found ? found.district : s;
        } else sub_district = s;
    }

    if (sub_district && (!district || !province) && thaiAddresses.length > 0) {
        const matches = thaiAddresses.filter(addr => addr.district === sub_district);
        if (matches.length > 0) {
            const uniqueDistricts = new Set(matches.map(m => m.amphoe));
            const uniqueProvinces = new Set(matches.map(m => m.province));
            if (uniqueDistricts.size === 1 && uniqueProvinces.size === 1) {
                if (!district) district = matches[0].amphoe;
                if (!province) province = matches[0].province;
            }
        }
    } else if (district && !province && thaiAddresses.length > 0) {
        const matches = thaiAddresses.filter(addr => addr.amphoe === district);
        if (matches.length > 0) {
            const uniqueProvinces = new Set(matches.map(m => m.province));
            if (uniqueProvinces.size === 1) province = matches[0].province;
        }
    }
    
    return {
        details: str || "ไม่ระบุ",
        sub_district,
        district,
        province
    };
};

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
                age: getVal(row, ["อายุ"]),
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

        const chunkArray = (array, size) => {
            const result = [];
            for (let i = 0; i < array.length; i += size) {
                result.push(array.slice(i, i + size));
            }
            return result;
        };

        const CONCURRENCY_LIMIT = 5; 
        const mappedDataWithIdx = mappedData.map((d, idx) => ({ ...d, _originalIndex: idx }));
        const batches = chunkArray(mappedDataWithIdx, CONCURRENCY_LIMIT);

        for (const batch of batches) {
            await Promise.all(batch.map(async (mappedRow) => {
                const i = mappedRow._originalIndex;
            
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

                    let informantQuery = `
                        INSERT INTO informants (first_name_th, middle_name_th, last_name_th, first_name_en, middle_name_en, last_name_en, informant_contact_channel, informant_id_card_passport, informant_phone, informant_email) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        RETURNING informant_id
                    `;
                    let informantRes = await client.query(informantQuery, [
                        validateLen(mappedRow.reporter_first_name_th, 255),
                        validateLen(mappedRow.reporter_middle_name_th, 255),
                        validateLen(mappedRow.reporter_last_name_th, 255),
                        validateLen(mappedRow.reporter_first_name_en, 255),
                        validateLen(mappedRow.reporter_middle_name_en, 255),
                        validateLen(mappedRow.reporter_last_name_en, 255),
                        mappedRow.reporter_contact, 
                        validateLen(mappedRow.reporter_id_card, 50), 
                        validateLen(mappedRow.reporter_phone, 50), 
                        validateLen(mappedRow.reporter_email, 100)
                    ]);
                    let informant_id = informantRes.rows[0].informant_id;

                    let ageInt = parseInt(mappedRow.age);
                    let validAge = isNaN(ageInt) ? null : ageInt;
                    let missingQuery = `
                        INSERT INTO missing_persons (first_name_th, middle_name_th, last_name_th, first_name_en, middle_name_en, last_name_en, age, gender, nationality, passport_number, missing_id_card_passport) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING missing_person_id
                    `;
                    let missingRes = await client.query(missingQuery, [
                        validateLen(mappedRow.missing_first_name_th, 255),
                        validateLen(mappedRow.missing_middle_name_th, 255),
                        validateLen(mappedRow.missing_last_name_th, 255),
                        validateLen(mappedRow.missing_first_name_en, 255),
                        validateLen(mappedRow.missing_middle_name_en, 255),
                        validateLen(mappedRow.missing_last_name_en, 255),
                        validAge, 
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
                        mappedRow.detected_location_details, mappedRow.detected_location_sub_district, mappedRow.detected_location_district, mappedRow.detected_location_province, drivePhotoUrl,
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
                    console.error(`[DB Error Row ${i+1}]:`, dbErr.message);
                    errors.push(`แถวที่ ${i + 1}: ${dbErr.message}`);
                } finally {
                    client.release();
                }
            }));

            if (jobId && global.uploadProgress[jobId]) {
                global.uploadProgress[jobId].current += batch.length;
            }
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
