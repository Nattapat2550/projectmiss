import React from "react";

interface IllegalCardProps {
  data: any; 
}

// ฟังก์ชันดึง Thumbnail จาก Google Drive
const getDirectImageUrl = (url: string) => {
  if (!url) return "";
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
    }
  }
  return url;
};

// ----------------------------------------------------------------------
// ฐานข้อมูลสัญชาติ - รหัสประเทศ (ครอบคลุมทั่วโลก ไทย/อังกฤษ/คำย่อ)
// ----------------------------------------------------------------------
const COUNTRY_MAP: { [key: string]: string } = {
  // อาเซียน & เอเชียตะวันออก
  "ไทย": "th", "thai": "th", "thailand": "th",
  "พม่า": "mm", "เมียนมา": "mm", "myanmar": "mm", "burma": "mm",
  "ลาว": "la", "laos": "la", "lao": "la",
  "กัมพูชา": "kh", "เขมร": "kh", "cambodia": "kh",
  "เวียดนาม": "vn", "vietnam": "vn",
  "มาเลเซีย": "my", "malaysia": "my",
  "สิงคโปร์": "sg", "singapore": "sg",
  "อินโดนีเซีย": "id", "indonesia": "id",
  "ฟิลิปปินส์": "ph", "philippines": "ph",
  "บรูไน": "bn", "brunei": "bn",
  "ติมอร์": "tl", "timor": "tl",
  "จีน": "cn", "china": "cn",
  "ไต้หวัน": "tw", "taiwan": "tw",
  "ญี่ปุ่น": "jp", "japan": "jp",
  "เกาหลีใต้": "kr", "south korea": "kr", "korea": "kr",
  "เกาหลีเหนือ": "kp", "north korea": "kp",
  "ฮ่องกง": "hk", "hong kong": "hk",
  "มาเก๊า": "mo", "macau": "mo",

  // เอเชียใต้ & ตะวันออกกลาง
  "อินเดีย": "in", "india": "in",
  "บังกลาเทศ": "bd", "bangladesh": "bd",
  "ปากีสถาน": "pk", "pakistan": "pk",
  "ศรีลังกา": "lk", "sri lanka": "lk",
  "เนปาล": "np", "nepal": "np",
  "ภูฏาน": "bt", "bhutan": "bt",
  "มัลดีฟส์": "mv", "maldives": "mv",
  "อัฟกานิสถาน": "af", "afghanistan": "af",
  "อิหร่าน": "ir", "iran": "ir",
  "อิรัก": "iq", "iraq": "iq",
  "ซาอุดีอาระเบีย": "sa", "ซาอุ": "sa", "saudi arabia": "sa",
  "ยูเออี": "ae", "สหรัฐอาหรับเอมิเรตส์": "ae", "uae": "ae", "united arab emirates": "ae",
  "อิสราเอล": "il", "israel": "il",
  "ตุรกี": "tr", "turkey": "tr",
  "ซีเรีย": "sy", "syria": "sy",
  "กาตาร์": "qa", "qatar": "qa",
  "คูเวต": "kw", "kuwait": "kw",
  "จอร์แดน": "jo", "jordan": "jo",
  "เลบานอน": "lb", "lebanon": "lb",
  "โอมาน": "om", "oman": "om",
  "เยเมน": "ye", "yemen": "ye",

  // ยุโรป
  "อังกฤษ": "gb", "สหราชอาณาจักร": "gb", "uk": "gb", "united kingdom": "gb", "england": "gb", "britain": "gb",
  "ฝรั่งเศส": "fr", "france": "fr",
  "เยอรมนี": "de", "เยอรมัน": "de", "germany": "de",
  "อิตาลี": "it", "italy": "it",
  "สเปน": "es", "spain": "es",
  "โปรตุเกส": "pt", "portugal": "pt",
  "เนเธอร์แลนด์": "nl", "ฮอลแลนด์": "nl", "netherlands": "nl", "holland": "nl",
  "เบลเยียม": "be", "belgium": "be",
  "สวิตเซอร์แลนด์": "ch", "สวิส": "ch", "switzerland": "ch", "swiss": "ch",
  "ออสเตรีย": "at", "austria": "at",
  "สวีเดน": "se", "sweden": "se",
  "นอร์เวย์": "no", "norway": "no",
  "เดนมาร์ก": "dk", "denmark": "dk",
  "ฟินแลนด์": "fi", "finland": "fi",
  "รัสเซีย": "ru", "russia": "ru",
  "ยูเครน": "ua", "ukraine": "ua",
  "โปแลนด์": "pl", "poland": "pl",
  "กรีซ": "gr", "greece": "gr",
  "ไอร์แลนด์": "ie", "ireland": "ie",
  "เช็ก": "cz", "czech": "cz",
  "ฮังการี": "hu", "hungary": "hu",
  "โรมาเนีย": "ro", "romania": "ro",

  // อเมริกาเหนือและใต้
  "สหรัฐอเมริกา": "us", "อเมริกา": "us", "usa": "us", "united states": "us", "america": "us",
  "แคนาดา": "ca", "canada": "ca",
  "เม็กซิโก": "mx", "mexico": "mx",
  "บราซิล": "br", "brazil": "br",
  "อาร์เจนตินา": "ar", "argentina": "ar",
  "โคลอมเบีย": "co", "colombia": "co",
  "ชิลี": "cl", "chile": "cl",
  "เปรู": "pe", "peru": "pe",
  "คิวบา": "cu", "cuba": "cu",

  // แอฟริกา
  "แอฟริกาใต้": "za", "south africa": "za",
  "อียิปต์": "eg", "egypt": "eg",
  "ไนจีเรีย": "ng", "nigeria": "ng",
  "เคนยา": "ke", "kenya": "ke",
  "โมร็อกโก": "ma", "morocco": "ma",
  "เอธิโอเปีย": "et", "ethiopia": "et",
  "กานา": "gh", "ghana": "gh",

  // โอเชียเนีย
  "ออสเตรเลีย": "au", "australia": "au",
  "นิวซีแลนด์": "nz", "new zealand": "nz",
  "ฟิจิ": "fj", "fiji": "fj",
  "ปาปัวนิวกินี": "pg", "papua new guinea": "pg",
};

// นำ Keys มาเรียงลำดับจาก "คำยาวที่สุด" ไป "สั้นที่สุด" ป้องกันปัญหาคำทับซ้อน (เช่น "เกาหลีใต้" vs "เกาหลี")
const SORTED_COUNTRY_KEYS = Object.keys(COUNTRY_MAP).sort((a, b) => b.length - a.length);

const getFlagUrl = (nationality: string) => {
  if (!nationality) return null;
  const nat = nationality.trim().toLowerCase();

  // วนลูปหาคำที่ตรงกันจากชุดคำที่เรียงความยาวไว้แล้ว
  const foundKey = SORTED_COUNTRY_KEYS.find((key) => nat.includes(key));

  return foundKey ? `https://flagcdn.com/w40/${COUNTRY_MAP[foundKey]}.png` : null;
};
// ----------------------------------------------------------------------

export default function IllegalCard({ data }: IllegalCardProps) {
  const fullNameTh = `${data.first_name_th || ""}${data.middle_name_th ? " " + data.middle_name_th : ""} ${data.last_name_th || ""}`.trim();
  const fullNameEn = data.first_name_en
    ? `${data.first_name_en}${data.middle_name_en ? " " + data.middle_name_en : ""} ${data.last_name_en ?? ""}`.trim()
    : "";

  const detectedDateFormatted = data.detected_date
    ? new Date(data.detected_date).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "-";

  const flagUrl = getFlagUrl(data.nationality);

  return (
    <div className="relative w-full bg-[#DFF5EC] rounded-2xl border border-[#9DD8BE] shadow-md overflow-hidden font-sans" style={{ aspectRatio: "856 / 540" }}>
      <div className="absolute inset-0 flex p-[4%] gap-[4%]">
        
        {/* คอลัมน์ซ้าย (รูปภาพและป้ายสัญชาติ) */}
        <div className="flex flex-col items-center shrink-0" style={{ width: "30%" }}>
          <p className="font-bold text-emerald-900 text-center leading-tight mb-[3%]" style={{ fontSize: "clamp(8px, 2.4vw, 20px)" }}>ผู้ลักลอบเข้าประเทศ</p>
          
          <span className="text-red-500 font-bold bg-red-50 border border-red-200 rounded-full flex items-center justify-center gap-1 mb-[5%]" style={{ fontSize: "clamp(5px, 1.2vw, 11px)", padding: "1% 8%" }}>
            สัญชาติ: 
            {flagUrl && <img src={flagUrl} alt="flag" className="w-3.5 h-2.5 object-cover rounded-[1px] shadow-[0_0_2px_rgba(0,0,0,0.2)]" />}
            {data.nationality || "ไม่ระบุ"}
          </span>

          <div className="bg-white border border-emerald-200 rounded-xl flex items-end justify-center overflow-hidden shadow-inner relative w-full" style={{ aspectRatio: "3/4" }}>
            {data.photo_url ? (
               <img 
                 src={getDirectImageUrl(data.photo_url)} 
                 alt="Profile" 
                 className="w-full h-full object-cover" 
                 referrerPolicy="no-referrer"
               />
            ) : (
              <div className="flex flex-col items-center justify-end w-full h-full pb-[8%]">
                <img src={"/enter.png"} className="opacity-40"></img>
              </div>
            )}
          </div>
        </div>

        {/* คอลัมน์ขวา (รายละเอียดข้อมูล) */}
        <div className="flex flex-col flex-1 gap-[4%] min-w-0">
          <div className="flex gap-[4%]">
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>จากประเทศ</ILabel>
              <IBox>
                <div className="flex items-center gap-1.5">
                  {flagUrl && <img src={flagUrl} alt="flag" className="w-4.5 h-3.25 object-cover rounded-xs shadow-[0_0_2px_rgba(0,0,0,0.2)]" />}
                  <span>{data.nationality || "-"}</span>
                </div>
              </IBox>
            </div>
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>เลขที่หนังสือเดินทาง</ILabel>
              <IBox mono>{data.passport_id || "-"}</IBox>
            </div>
          </div>

          <div className="flex flex-col gap-[4%]">
            <ILabel>ชื่อ - นามสกุล</ILabel>
            <IBox noTruncate>
              <div className="truncate">{fullNameTh || "ไม่ระบุชื่อ"}</div>
              {fullNameEn && <div className="truncate text-[0.82em] opacity-75 font-normal tracking-wide mt-[0.5%]">{fullNameEn}</div>}
            </IBox>
          </div>

          <div className="flex gap-[4%]">
            <div className="flex flex-col gap-[6%]" style={{ width: "55%" }}>
              <ILabel>สัญชาติ</ILabel>
              <IBox>
                <div className="flex items-center gap-1.5">
                  {flagUrl && <img src={flagUrl} alt="flag" className="w-4.5 h-3.25 object-cover rounded-xs shadow-[0_0_2px_rgba(0,0,0,0.2)]" />}
                  <span>{data.nationality || "-"}</span>
                </div>
              </IBox>
            </div>
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>เพศ</ILabel>
              <IBox>{data.gender || "-"}</IBox>
            </div>
          </div>

          <div className="flex flex-col gap-[4%]">
            <ILabel>วันที่ตรวจเจอ</ILabel>
            <IBox>{detectedDateFormatted}</IBox>
          </div>
        </div>
      </div>
    </div>
  );
}

function ILabel({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-emerald-950" style={{ fontSize: "clamp(5px, 1.3vw, 11px)" }}>{children}</span>;
}
function IBox({ children, mono = false, noTruncate = false }: { children: React.ReactNode; mono?: boolean; noTruncate?: boolean; }) {
  return (
    <div className={`bg-[#B8E8D4] rounded-md text-emerald-900 font-medium ${mono ? "font-mono" : ""} ${noTruncate ? "flex flex-col justify-center" : "truncate"}`} style={{ fontSize: "clamp(6px, 1.5vw, 13px)", padding: "4% 6%", minHeight: "18%" }}>
      {children}
    </div>
  );
}