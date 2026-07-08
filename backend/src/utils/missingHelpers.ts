// backend/utils/immigrantHelpers.js

const convertBEtoAD = (dateStr) => {
  if (!dateStr || String(dateStr).trim() === "") return null;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
      let year = parseInt(parts[0], 10);
      if (year > 2400) {
          year -= 543;
          return `${year}-${parts[1]}-${parts[2]}`;
      }
  }
  return dateStr;
};

const safeParseDate = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  
  if (typeof dateVal === 'string' && dateVal.includes('/')) {
      const parts = dateVal.split('/');
      if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          if (year > 2400) year -= 543;
          if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              return new Date(Date.UTC(year, month - 1, day));
          }
      }
  }
  return null;
};

const parseThaiDateToDate = (text) => {
  if (!text) return null;
  const thaiMonths = { "ม.ค.": "01", "ก.พ.": "02", "มี.ค.": "03", "เม.ย.": "04", "พ.ค.": "05", "มิ.ย.": "06", "ก.ค.": "07", "ส.ค.": "08", "ก.ย.": "09", "ต.ค.": "10", "พ.ย.": "11", "ธ.ค.": "12" };
  const match = String(text).match(/(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[2]) + 2500 - 543;
  return new Date(`${year}-${thaiMonths[match[1]]}-01T00:00:00Z`);
};

const findValue = (rowObj, keyword) => {
  const cleanStr = (str) => str.replace(/[\s\-\–\—\_]+/g, '');
  const cleanKeyword = cleanStr(keyword);
  let matchedKey = Object.keys(rowObj).find(k => cleanStr(k) === cleanKeyword) || Object.keys(rowObj).find(k => cleanStr(k).includes(cleanKeyword));
  return matchedKey ? rowObj[matchedKey] : null;
};

const processName = (rawFullName) => {
  let cleanFullName = String(rawFullName).trim();
  
  // ตัดข้อความในวงเล็บออก และตัดคำว่า "หรือ..." หรือ "or..." ออกไปเลย
  cleanFullName = cleanFullName.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  cleanFullName = cleanFullName.replace(/\s+(หรือ|or)\s+.*$/i, '').trim();

  const prefixRegex = /^(นาย|นางสาว|นาง|น\.ส\.|น\.ส|ด\.ช\.|ด\.ญ\.|ด\.ช|ด\.ญ|Mr\.|Mrs\.|Ms\.|Miss\.|Master\.|Mr|Mrs|Ms|Miss|Master)\s*/i;
  const matchPrefix = cleanFullName.match(prefixRegex);
  
  const prefix = matchPrefix ? matchPrefix[1].trim() : "";
  if (matchPrefix) cleanFullName = cleanFullName.substring(matchPrefix[0].length).trim();

  const parts = cleanFullName.split(/\s+/).filter(p => p !== "");
  const fname = parts[0] || "";
  const mname = parts.length >= 3 ? parts[1] : null;
  const lname = parts.length === 2 ? parts[1] : parts.length >= 3 ? parts.slice(2).join(" ") : "";
  const isThai = /[ก-๙]/.test(cleanFullName);

  return { prefix, fname, mname, lname, isThai, hasName: !!(fname || lname) };
};

const processVictimStatus = (row) => {
  const rawScreening = findValue(row, "ผลการคัดกรอง") || findValue(row, "เป็นผู้เสียหาย");
  const screeningStr = rawScreening != null ? String(rawScreening).trim() : "";
  const isNotEmpty = screeningStr !== "" && !["-", "–", "—"].includes(screeningStr);

  if (isNotEmpty) return { isVictim: true, details: screeningStr };

  const emptyKey = Object.keys(row).find(k => k.startsWith("__EMPTY") && row[k] != null && String(row[k]).trim() !== "" && !["-", "–", "—"].includes(String(row[k]).trim()));
  return { isVictim: false, details: emptyKey ? String(row[emptyKey]).trim() : "ไม่เป็นผู้เสียหาย (ไม่มีข้อความอธิบายในไฟล์)" };
};

const determineGender = (row, prefix) => {
  let gender = findValue(row, "เพศ") || findValue(row, "Gender");
  if (!gender && prefix) {
    const p = prefix.toLowerCase();
    if (["นาย", "ด.ช.", "ด.ช", "mr", "mr.", "master", "master.", "boy", "mister"].includes(p)) return "ชาย";
    if (["นาง", "นางสาว", "น.ส.", "น.ส", "ด.ญ.", "ด.ญ", "miss", "miss.", "mrs", "mrs.", "ms", "ms.", "girl"].includes(p)) return "หญิง";
  }
  return gender || null;
};

const normalizeNationality = (rawNat) => {
  if (!rawNat) return null;
  
  let nat = String(rawNat).trim().toLowerCase();
  nat = nat.replace(/^(ประเทศ|ชาว|สัญชาติ|คน)\s*/g, '').trim();

  const countryMap = {
      "ไทย": "ไทย", "thai": "ไทย", "thailand": "ไทย", "th": "ไทย", "ไท": "ไทย",
      "พม่า": "เมียนมา", "เมียนมา": "เมียนมา", "เมียนมาร์": "เมียนมา", "myanmar": "เมียนมา", "burma": "เมียนมา", "mm": "เมียนมา", "เมืยนมา": "เมียนมา", "เมียมา": "เมียนมา",
      "ลาว": "ลาว", "lao": "ลาว", "laos": "ลาว", "สปป.ลาว": "ลาว", "สปป ลาว": "ลาว",
      "กัมพูชา": "กัมพูชา", "เขมร": "กัมพูชา", "cambodia": "กัมพูชา", "khmer": "กัมพูชา", "กัมพูซา": "กัมพูชา",
      "เวียดนาม": "เวียดนาม", "เวียตนาม": "เวียดนาม", "vietnam": "เวียดนาม", "viet nam": "เวียดนาม", "vn": "เวียดนาม", "เวียด": "เวียดนาม",
      "มาเลเซีย": "มาเลเซีย", "มาเล": "มาเลเซีย", "malaysia": "มาเลเซีย", "malay": "มาเลเซีย", "my": "มาเลเซีย",
      "อินโดนีเซีย": "อินโดนีเซีย", "อินโด": "อินโดนีเซีย", "indonesia": "อินโดนีเซีย", "id": "อินโดนีเซีย",
      "ฟิลิปปินส์": "ฟิลิปปินส์", "ฟิลิปินส์": "ฟิลิปปินส์", "philippines": "ฟิลิปปินส์", "philippine": "ฟิลิปปินส์", "ph": "ฟิลิปปินส์", "ฟิลลิปปินส์": "ฟิลิปปินส์",
      "สิงคโปร์": "สิงคโปร์", "singapore": "สิงคโปร์", "sg": "สิงคโปร์", "สิงคโปร": "สิงคโปร์",
      "บรูไน": "บรูไน", "brunei": "บรูไน",
      "ติมอร์-เลสเต": "ติมอร์-เลสเต", "timor-leste": "ติมอร์-เลสเต", "ติมอร์": "ติมอร์-เลสเต", "timor": "ติมอร์-เลสเต",
      "จีน": "จีน", "china": "จีน", "chinese": "จีน", "cn": "จีน", "สาธารณรัฐประชาชนจีน": "จีน", "ไชน่า": "จีน", "จีนแดง": "จีน",
      "ญี่ปุ่น": "ญี่ปุ่น", "japan": "ญี่ปุ่น", "jp": "ญี่ปุ่น", "เจแปน": "ญี่ปุ่น", "japanese": "ญี่ปุ่น",
      "เกาหลีใต้": "เกาหลีใต้", "เกาหลี": "เกาหลีใต้", "south korea": "เกาหลีใต้", "korea": "เกาหลีใต้", "kr": "เกาหลีใต้", "เกาหลีไต้": "เกาหลีใต้", "republic of korea": "เกาหลีใต้",
      "เกาหลีเหนือ": "เกาหลีเหนือ", "north korea": "เกาหลีเหนือ", "dprk": "เกาหลีเหนือ",
      "ไต้หวัน": "ไต้หวัน", "taiwan": "ไต้หวัน", "tw": "ไต้หวัน",
      "ฮ่องกง": "ฮ่องกง", "hong kong": "ฮ่องกง", "hongkong": "ฮ่องกง", "hk": "ฮ่องกง",
      "มาเก๊า": "มาเก๊า", "macau": "มาเก๊า", "macao": "มาเก๊า",
      "อินเดีย": "อินเดีย", "india": "อินเดีย", "in": "อินเดีย", "แขก": "อินเดีย", "indian": "อินเดีย",
      "บังกลาเทศ": "บังกลาเทศ", "บังคลาเทศ": "บังกลาเทศ", "bangladesh": "บังกลาเทศ",
      "ปากีสถาน": "ปากีสถาน", "pakistan": "ปากีสถาน",
      "ศรีลังกา": "ศรีลังกา", "sri lanka": "ศรีลังกา",
      "เนปาล": "เนปาล", "nepal": "เนปาล",
      "อัฟกานิสถาน": "อัฟกานิสถาน", "afghanistan": "อัฟกานิสถาน",
      "มัลดีฟส์": "มัลดีฟส์", "maldives": "มัลดีฟส์",
      "ภูฏาน": "ภูฏาน", "bhutan": "ภูฏาน",
      "อิหร่าน": "อิหร่าน", "iran": "อิหร่าน",
      "อิรัก": "อิรัก", "iraq": "อิรัก",
      "ซาอุดีอาระเบีย": "ซาอุดีอาระเบีย", "ซาอุ": "ซาอุดีอาระเบีย", "saudi arabia": "ซาอุดีอาระเบีย", "saudi": "ซาอุดีอาระเบีย",
      "สหรัฐอาหรับเอมิเรตส์": "ยูเออี", "uae": "ยูเออี", "ยูเออี": "ยูเออี", "ดูไบ": "ยูเออี", "dubai": "ยูเออี", "united arab emirates": "ยูเออี",
      "กาตาร์": "กาตาร์", "qatar": "กาตาร์",
      "คูเวต": "คูเวต", "kuwait": "คูเวต",
      "อิสราเอล": "อิสราเอล", "israel": "อิสราเอล",
      "ตุรกี": "ตุรกี", "ตุรเคีย": "ตุรกี", "turkey": "ตุรกี", "turkiye": "ตุรกี",
      "ซีเรีย": "ซีเรีย", "syria": "ซีเรีย",
      "จอร์แดน": "จอร์แดน", "jordan": "จอร์แดน",
      "เลบานอน": "เลบานอน", "lebanon": "เลบานอน",
      "โอมาน": "โอมาน", "oman": "โอมาน",
      "สหราชอาณาจักร": "สหราชอาณาจักร", "อังกฤษ": "สหราชอาณาจักร", "uk": "สหราชอาณาจักร", "england": "สหราชอาณาจักร", "britain": "สหราชอาณาจักร", "united kingdom": "สหราชอาณาจักร", "british": "สหราชอาณาจักร",
      "รัสเซีย": "รัสเซีย", "russia": "รัสเซีย", "russian": "รัสเซีย",
      "ฝรั่งเศส": "ฝรั่งเศส", "france": "ฝรั่งเศส", "french": "ฝรั่งเศส",
      "เยอรมนี": "เยอรมนี", "เยอรมัน": "เยอรมนี", "เยอรมันนี": "เยอรมนี", "germany": "เยอรมนี", "german": "เยอรมนี",
      "อิตาลี": "อิตาลี", "italy": "อิตาลี", "italian": "อิตาลี",
      "สเปน": "สเปน", "spain": "สเปน", "spanish": "สเปน",
      "โปรตุเกส": "โปรตุเกส", "portugal": "โปรตุเกส",
      "เนเธอร์แลนด์": "เนเธอร์แลนด์", "ฮอลแลนด์": "เนเธอร์แลนด์", "netherlands": "เนเธอร์แลนด์", "holland": "เนเธอร์แลนด์", "dutch": "เนเธอร์แลนด์",
      "สวิตเซอร์แลนด์": "สวิตเซอร์แลนด์", "สวิส": "สวิตเซอร์แลนด์", "switzerland": "สวิตเซอร์แลนด์", "swiss": "สวิตเซอร์แลนด์",
      "สวีเดน": "สวีเดน", "sweden": "สวีเดน", "swedish": "สวีเดน",
      "เดนมาร์ก": "เดนมาร์ก", "denmark": "เดนมาร์ก",
      "นอร์เวย์": "นอร์เวย์", "norway": "นอร์เวย์",
      "ฟินแลนด์": "ฟินแลนด์", "finland": "ฟินแลนด์",
      "ยูเครน": "ยูเครน", "ukraine": "ยูเครน",
      "โปแลนด์": "โปแลนด์", "poland": "โปแลนด์",
      "ออสเตรีย": "ออสเตรีย", "austria": "ออสเตรีย",
      "เช็ก": "เช็ก", "czech": "เช็ก", "czechia": "เช็ก",
      "เบลเยียม": "เบลเยียม", "belgium": "เบลเยียม",
      "กรีซ": "กรีซ", "greece": "กรีซ", "greek": "กรีซ",
      "ไอร์แลนด์": "ไอร์แลนด์", "ireland": "ไอร์แลนด์",
      "โรมาเนีย": "โรมาเนีย", "romania": "โรมาเนีย",
      "ฮังการี": "ฮังการี", "hungary": "ฮังการี",
      "สหรัฐอเมริกา": "สหรัฐอเมริกา", "อเมริกา": "สหรัฐอเมริกา", "usa": "สหรัฐอเมริกา", "us": "สหรัฐอเมริกา", "america": "สหรัฐอเมริกา", "สหรัฐ": "สหรัฐอเมริกา", "อเมริกัน": "สหรัฐอเมริกา", "united states": "สหรัฐอเมริกา", "american": "สหรัฐอเมริกา",
      "แคนาดา": "แคนาดา", "canada": "แคนาดา", "canadian": "แคนาดา",
      "เม็กซิโก": "เม็กซิโก", "mexico": "เม็กซิโก",
      "บราซิล": "บราซิล", "brazil": "บราซิล",
      "อาร์เจนตินา": "อาร์เจนตินา", "argentina": "อาร์เจนตินา",
      "ชิลี": "ชิลี", "chile": "ชิลี",
      "โคลอมเบีย": "โคลอมเบีย", "colombia": "โคลอมเบีย",
      "เปรู": "เปรู", "peru": "เปรู",
      "คิวบา": "คิวบา", "cuba": "คิวบา",
      "เวเนซุเอลา": "เวเนซุเอลา", "venezuela": "เวเนซุเอลา",
      "ออสเตรเลีย": "ออสเตรเลีย", "australia": "ออสเตรเลีย", "aus": "ออสเตรเลีย", "australian": "ออสเตรเลีย",
      "นิวซีแลนด์": "นิวซีแลนด์", "new zealand": "นิวซีแลนด์", "nz": "นิวซีแลนด์",
      "ฟิจิ": "ฟิจิ", "fiji": "ฟิจิ",
      "ปาปัวนิวกินี": "ปาปัวนิวกินี", "papua new guinea": "ปาปัวนิวกินี",
      "แอฟริกาใต้": "แอฟริกาใต้", "south africa": "แอฟริกาใต้", "za": "แอฟริกาใต้",
      "อียิปต์": "อียิปต์", "egypt": "อียิปต์",
      "ไนจีเรีย": "ไนจีเรีย", "nigeria": "ไนจีเรีย",
      "เคนยา": "เคนยา", "kenya": "เkenya",
      "โมร็อกโก": "โมร็อกโก", "morocco": "โมร็อกโก",
      "กานา": "กานา", "ghana": "กานา",
      "เอธิโอเปีย": "เอธิโอเปีย", "ethiopia": "เอธิโอเปีย",
      "ซูดาน": "ซูดาน", "sudan": "ซูดาน",
      "อัลจีเรีย": "อัลจีเรีย", "algeria": "อัลจีเรีย"
  };

  if (countryMap[nat]) return countryMap[nat];
  if (/^[a-zA-Z\s]+$/.test(nat)) return nat.replace(/\b\w/g, c => c.toUpperCase());
  return String(rawNat).replace(/^(ประเทศ|ชาว|สัญชาติ|คน)\s*/g, '').trim();
};

export { 
  convertBEtoAD,
  safeParseDate,
  parseThaiDateToDate,
  findValue,
  processName,
  processVictimStatus,
  determineGender,
  normalizeNationality
 };