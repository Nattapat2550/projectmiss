const fs = require("fs");
const path = require("path");
const { uploadToDrive } = require("../services/googleDriveService");

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

const validateLen = (val, maxLen) => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
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

module.exports = {
    splitThaiAddress,
    validateLen,
    formatExcelDate,
    formatExcelTime,
    parseDateForDB,
    uploadWithRetry,
    downloadImageToBuffer,
    getVal
};
