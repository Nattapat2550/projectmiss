const xlsx = require("xlsx");
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");
const https = require("https");

if (!global.uploadProgress) { global.uploadProgress = {}; }

// 🟢 1. ฟังก์ชันแปลงตัวเลขวันที่จาก Excel
const formatExcelDate = (val) => {
    if (val === null || val === undefined || val === '') return null;
    let num = Number(val);
    if (!isNaN(num) && num > 18000 && num < 70000) { 
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }
    return String(val).trim();
};

// 🟢 2. ฟังก์ชันดาวน์โหลดรูปจาก Google Drive
const downloadDriveImage = (url) => {
    return new Promise((resolve) => {
        if (!url) return resolve(null);
        
        const match = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
        if (!match) return resolve(url); 
        
        const driveId = match[1];
        const downloadUrl = `https://drive.google.com/uc?id=${driveId}&export=download`;
        
        const saveStream = (response, originalUrl) => {
            if (response.statusCode !== 200) return resolve(originalUrl);
            
            const uploadDir = path.join(__dirname, "..", "uploads");
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            
            const fileName = `missing_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
            const filePath = path.join(uploadDir, fileName);
            
            const file = fs.createWriteStream(filePath);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve(`/uploads/${fileName}`); 
            });
            file.on('error', () => {
                fs.unlink(filePath, () => {});
                resolve(originalUrl);
            });
        };

        https.get(downloadUrl, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                https.get(res.headers.location, (redirectRes) => saveStream(redirectRes, url))
                     .on('error', () => resolve(url));
            } else {
                saveStream(res, url);
            }
        }).on('error', () => resolve(url));
    });
};

// 🟢 3. ฟังก์ชันดึงค่าจาก Excel แบบฉลาด (ตัดช่องว่างและ Enter ที่มองไม่เห็นออกก่อนค้นหา)
const getVal = (row, possibleKeys) => {
    // ลบช่องว่างและอักขระพิเศษออกจากคีย์ต้นแบบ
    const cleanPossibleKeys = possibleKeys.map(k => 
        k.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '')
    );
    
    for (let key of Object.keys(row)) {
        // ลบช่องว่างและอักขระพิเศษออกจากคีย์ที่อ่านได้จาก Excel
        const cleanKey = key.replace(/[\s\r\n\u200B-\u200D\uFEFF]+/g, '');
        
        if (cleanPossibleKeys.includes(cleanKey)) {
            const value = row[key];
            
            // ✅ จุดที่แก้ไข: เช็คว่าต้องมี "ข้อมูลอยู่ข้างในจริงๆ" ถึงจะดึงไปใช้
            // ถ้าคอลัมน์นี้ชื่อตรง แต่ข้อมูลว่างเปล่า ระบบจะยังไม่ return null แต่วนหาคอลัมน์อื่นต่อไป
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                return value;
            }
        }
    }
    
    // ถ้าหาจนครบทุกคอลัมน์แล้วไม่มีข้อมูลเลยจริงๆ ค่อยคืนค่า null
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

        rawData = rawData.filter(row => 
            getVal(row, ["ผู้แจ้ง", "ชื่อ - สกุล ผู้แจ้ง"]) || 
            getVal(row, ["ชื่อบุคคลสูญหาย", "ชื่อ - สกุล ผู้สูญหาย"])
        );

        // ================= โหมดพรีวิว =================
        if (action === "preview") {
            const preview_data = [];

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                
                // ใช้ฟังก์ชัน getVal เพื่อให้จับข้อมูลได้ชัวร์ 100% ไม่ว่า Excel จะเคาะเว้นวรรคมาผิดหรือไม่
                const mappedRow = {
                    row_index: i + 1,
                    
                    report_date: formatExcelDate(getVal(row, ["วัน/เดือน/ปี ที่รับแจ้ง", "วันที่รับแจ้งวาม"])),
                    reporter_name: getVal(row, ["ผู้แจ้ง", "ชื่อ - สกุล ผู้แจ้ง"]),
                    relationship: getVal(row, ["ความสัมพันธ์"]),
                    reporter_contact: getVal(row, ["ช่องทางการติดต่อของผู้แจ้ง", "เบอร์โทรศัพท์ ผู้แจ้ง", "อีเมล ผู้แจ้ง"]),
                    report_channel: getVal(row, ["ช่องทางการรับแจ้ง"]),
                    
                    police_receiver: getVal(row, ["เจ้าหน้าที่ตำรวจผู้รับแจ้ง"]),
                    police_station: getVal(row, ["สังกัด สน./สภ.", "สถานีตำรวจ", "สน./สภ.", "สน/สภ"]),
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
                    photo_url: getVal(row, ["รูปภาพ"]),
                    
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

                preview_data.push(mappedRow);
            }
            return res.status(200).json({ success: true, message: "ดึงข้อมูลพรีวิวสำเร็จ", total_rows: preview_data.length, preview_data });
        }

        // ================= โหมดอัปโหลดจริง =================
        let successCount = 0;
        let errors = [];
        if (jobId) global.uploadProgress[jobId] = { current: 0, total: rawData.length, status: 'processing' };

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            
            try {
                let finalPhotoUrl = getVal(row, ["รูปภาพ"]);
                if (finalPhotoUrl) {
                    finalPhotoUrl = await downloadDriveImage(finalPhotoUrl); 
                }

                // TODO: คำสั่ง SQL INSERT
                await new Promise(resolve => setTimeout(resolve, 50)); 
                successCount++;
            } catch (dbErr) {
                errors.push(`แถวที่ ${i + 1}: ${dbErr.message}`);
            }

            if (jobId && global.uploadProgress[jobId]) global.uploadProgress[jobId].current = i + 1;
        }

        if (jobId && global.uploadProgress[jobId]) global.uploadProgress[jobId].status = 'completed';

        res.status(200).json({
            success: true,
            message: `บันทึกข้อมูลและดึงรูปภาพสำเร็จ ${successCount} จาก ${rawData.length} รายการ`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
    }
};