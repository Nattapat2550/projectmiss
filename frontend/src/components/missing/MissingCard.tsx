import React from "react";

interface MissingCardProps {
  data: any; 
}

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

const COUNTRY_MAP: { [key: string]: string } = {
  "ไทย": "th", "thai": "th", "thailand": "th",
  "พม่า": "mm", "เมียนมา": "mm", "myanmar": "mm", "burma": "mm",
  "ลาว": "la", "laos": "la", "lao": "la",
  "กัมพูชา": "kh", "เขมร": "kh", "cambodia": "kh",
  "เวียดนาม": "vn", "vietnam": "vn",
  "มาเลเซีย": "my", "malaysia": "my",
  "สิงคโปร์": "sg", "singapore": "sg",
  "อินโดนีเซีย": "id", "indonesia": "id",
  "ฟิลิปปินส์": "ph", "philippines": "ph",
  "จีน": "cn", "china": "cn",
  "ไต้หวัน": "tw", "taiwan": "tw",
  "ญี่ปุ่น": "jp", "japan": "jp",
  "เกาหลีใต้": "kr", "south korea": "kr", "korea": "kr",
  "อินเดีย": "in", "india": "in",
  "บังกลาเทศ": "bd", "bangladesh": "bd",
  "ปากีสถาน": "pk", "pakistan": "pk",
  "อังกฤษ": "gb", "สหราชอาณาจักร": "gb", "uk": "gb",
  "ฝรั่งเศส": "fr", "france": "fr",
  "เยอรมนี": "de", "เยอรมัน": "de", "germany": "de",
  "สหรัฐอเมริกา": "us", "อเมริกา": "us", "usa": "us",
  "ออสเตรเลีย": "au", "australia": "au",
  // สามารถเพิ่มได้ตาม COUNTRY_MAP เดิม
};

const SORTED_COUNTRY_KEYS = Object.keys(COUNTRY_MAP).sort((a, b) => b.length - a.length);

const getFlagUrl = (nationality: string) => {
  if (!nationality) return null;
  const nat = nationality.trim().toLowerCase();
  const foundKey = SORTED_COUNTRY_KEYS.find((key) => nat.includes(key));
  return foundKey ? `https://flagcdn.com/w40/${COUNTRY_MAP[foundKey]}.png` : null;
};

export default function MissingCard({ data }: MissingCardProps) {
  const fullName = data.missing_person_name || "ไม่ระบุชื่อ";
  const missingLocation = data.missing_location || data.last_seen_location_province || "-";

  const missingDateFormatted = data.missing_date
    ? new Date(data.missing_date).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "ไม่ระบุวันที่";

  const flagUrl = getFlagUrl(data.nationality);
  const isFound = !!data.found_date;

  return (
    <div className="relative w-full bg-[#EBF3FF] rounded-2xl border border-[#A3C4FF] shadow-md overflow-hidden font-sans aspect-856/540">
      <div className="absolute inset-0 flex p-[4%] gap-[4%]">
        
        {/* คอลัมน์ซ้าย */}
        <div className="flex flex-col items-center shrink-0 w-[30%]">
          <p className="font-bold text-blue-900 text-center leading-tight mb-[3%] text-[clamp(8px,2.4vw,20px)]">บุคคลสูญหาย</p>
          
          <span className="text-red-500 font-bold bg-red-50 border border-red-200 rounded-full flex items-center justify-center gap-1 mb-[5%] text-[clamp(5px,1.2vw,11px)] py-[1%] px-[8%]">
            สัญชาติ: 
            {flagUrl && <img src={flagUrl} alt="flag" className="w-3.5 h-2.5 object-cover rounded-[1px] shadow-[0_0_2px_rgba(0,0,0,0.2)]" />}
            {data.nationality || "ไม่ระบุ"}
          </span>

          <div className="bg-white border border-blue-200 rounded-xl flex items-end justify-center overflow-hidden shadow-inner relative w-full aspect-3/4">
            {data.photo_url ? (
               <img 
                 src={getDirectImageUrl(data.photo_url)} 
                 alt="Profile" 
                 className="w-full h-full object-cover" 
                 referrerPolicy="no-referrer"
               />
            ) : (
              <div className="flex flex-col items-center justify-end w-full h-full pb-[8%]">
                <img src={"/user.png"} className="opacity-30 w-1/2 object-contain" alt="No Image"></img>
              </div>
            )}
          </div>
        </div>

        {/* คอลัมน์ขวา */}
        <div className="flex flex-col flex-1 gap-[4%] min-w-0">
          <div className="flex gap-[4%]">
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>อายุ / เพศ</ILabel>
              <IBox>
                <div className="flex items-center gap-1.5">
                  <span>{data.age ? `${data.age} ปี` : "-"} / {data.gender || "-"}</span>
                </div>
              </IBox>
            </div>
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>เลขประจำตัว/พาสปอร์ต</ILabel>
              <IBox mono>{data.missing_id_card_passport || data.passport_number || "-"}</IBox>
            </div>
          </div>

          <div className="flex flex-col gap-[4%]">
            <ILabel>ชื่อ - นามสกุล ผู้สูญหาย</ILabel>
            <IBox noTruncate>
              <div className="truncate">{fullName}</div>
            </IBox>
          </div>

          <div className="flex gap-[4%]">
            <div className="flex flex-col gap-[6%] w-[55%]">
              <ILabel>สถานที่สูญหายล่าสุด</ILabel>
              <IBox>
                <span className="truncate block w-full" title={missingLocation}>{missingLocation}</span>
              </IBox>
            </div>
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>สถานะการค้นหา</ILabel>
              <IBox>
                <span className={`${isFound ? "text-green-700" : "text-red-600"} font-bold`}>
                  {isFound ? "พบตัวแล้ว" : "ยังไม่พบตัว"}
                </span>
              </IBox>
            </div>
          </div>

          <div className="flex flex-col gap-[4%]">
            <ILabel>วันที่สูญหาย</ILabel>
            <IBox>{missingDateFormatted}</IBox>
          </div>
        </div>
      </div>
    </div>
  );
}

function ILabel({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-blue-950 text-[clamp(5px,1.3vw,11px)]">{children}</span>;
}

function IBox({ children, mono = false, noTruncate = false }: { children: React.ReactNode; mono?: boolean; noTruncate?: boolean; }) {
  return (
    <div className={`bg-[#C6DBFF] rounded-md text-blue-950 font-medium min-h-[18%] text-[clamp(6px,1.5vw,13px)] py-[4%] px-[6%] ${mono ? "font-mono" : ""} ${noTruncate ? "flex flex-col justify-center" : "truncate"}`}>
      {children}
    </div>
  );
}