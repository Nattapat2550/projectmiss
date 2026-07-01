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

const formatNationalId = (id: string): string => {
  if (!id || id.trim().length !== 13) return id || "-";
  return id.replace(/^(\d)(\d{4})(\d{5})(\d{2})(\d)$/, "$1-$2-$3-$4-$5");
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "-"
      : date.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "-";
  }
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
  "บรูไน": "bn", "brunei": "bn",
  "ติมอร์": "tl", "timor": "tl",
  "จีน": "cn", "china": "cn",
  "ไต้หวัน": "tw", "taiwan": "tw",
  "ญี่ปุ่น": "jp", "japan": "jp",
  "เกาหลีใต้": "kr", "south korea": "kr", "korea": "kr",
  "เกาหลีเหนือ": "kp", "north korea": "kp",
  "ฮ่องกง": "hk", "hong kong": "hk",
  "มาเก๊า": "mo", "macau": "mo",
  "อินเดีย": "in", "india": "in",
  "บังกลาเทศ": "bd", "bangladesh": "bd",
  "ปากีสถาน": "pk", "pakistan": "pk",
  "ศรีลังกา": "lk", "sri lanka": "lk",
  "เนปาล": "np", "nepal": "np",
  "อัฟกานิสถาน": "af", "afghanistan": "af",
  "อังกฤษ": "gb", "สหราชอาณาจักร": "gb", "uk": "gb",
  "สหรัฐอเมริกา": "us", "อเมริกา": "us", "usa": "us",
};

const SORTED_COUNTRY_KEYS = Object.keys(COUNTRY_MAP).sort((a, b) => b.length - a.length);

const getFlagUrl = (nationality: string) => {
  if (!nationality) return null;
  const nat = nationality.trim().toLowerCase();
  const foundKey = SORTED_COUNTRY_KEYS.find((key) => nat.includes(key));
  return foundKey ? `https://flagcdn.com/w40/${COUNTRY_MAP[foundKey]}.png` : null;
};

export default function MissingCard({ data }: MissingCardProps) {
  if (!data) return null;

  const flagUrl = getFlagUrl(data.nationality);

  const fullNameTh = `${data.missing_first_name_th || ""}${data.missing_middle_name_th ? " " + data.missing_middle_name_th : ""} ${data.missing_last_name_th || ""}`.trim();
  const fullNameEn = data.missing_first_name_en
    ? `${data.missing_first_name_en}${data.missing_middle_name_en ? " " + data.missing_middle_name_en : ""} ${data.missing_last_name_en ?? ""}`.trim()
    : "";

  const dateValue = formatDate(data.found_date);

  const getDobText = () => {
    if (data.date_of_birth) {
      return formatDate(data.date_of_birth);
    }
    return "-";
  };

  const getLocationText = () => {
    const parts = [];
    if (data.detected_location_details) parts.push(data.detected_location_details);
    
    const subParts = [
      data.detected_location_sub_district ? `ต.${data.detected_location_sub_district}` : "",
      data.detected_location_district ? `อ.${data.detected_location_district}` : "",
      data.detected_location_province ? `จ.${data.detected_location_province}` : "",
    ].filter(Boolean).join(" ");
    
    if (subParts) parts.push(subParts);
    return parts.join(" | ") || "-";
  };

  let victimStatusStr = "ไม่คัดกรองสถานะ";
  let victimColorClass = "text-yellow-700 bg-yellow-100 border-yellow-400";

  if (data.human_trafficking_indicators === true || data.human_trafficking_indicators === "YES" || data.human_trafficking_indicators === "true") {
    victimStatusStr = "เป็นผู้เสียหาย";
    victimColorClass = "text-red-700 bg-red-100 border-red-400";
  } else if (data.human_trafficking_indicators === false || data.human_trafficking_indicators === "NO" || data.human_trafficking_indicators === "false") {
    victimStatusStr = "ไม่เป็นผู้เสียหาย";
    victimColorClass = "text-green-700 bg-green-100 border-green-400";
  }

  const informantFullNameTh = `${data.informant_first_name_th || ""}${data.informant_middle_name_th ? " " + data.informant_middle_name_th : ""} ${data.informant_last_name_th || ""}`.trim();

  return (
    <div className="relative w-full bg-[#DFF5EC] rounded-2xl border border-[#9DD8BE] shadow-md overflow-hidden font-sans pt-[6%] mb-6" style={{ aspectRatio: "856 / 540" }}>
      
      <div className="absolute top-[3%] left-0 w-full text-center">
        <p className="font-bold text-emerald-950 tracking-wide" style={{ fontSize: "clamp(12px, 2.8vw, 24px)" }}>
          ผู้สูญหาย
        </p>
      </div>

      <div className="absolute inset-0 top-[11%] flex p-[4%] pt-0 gap-[3%]">
        
        <div className="flex flex-col flex-1 gap-[2%] min-w-0">
          
          <div className="flex gap-[3%]">
            <div className="flex flex-col gap-[3%] flex-1">
              <ILabel>ชื่อ - นามสกุล</ILabel>
              <IBox>{fullNameTh || "-"}</IBox>
            </div>
            <div className="flex flex-col gap-[3%] flex-1">
              <ILabel>Name</ILabel>
              <IBox>{fullNameEn || "-"}</IBox>
            </div>
          </div>

          <div className="flex gap-[3%]">
            <div className="flex flex-col gap-[3%] flex-1">
              <ILabel>เลขประจำตัวประชาชน</ILabel>
              <IBox mono>{formatNationalId(data.missing_id_card_passport) || "-"}</IBox>
            </div>
            <div className="flex flex-col gap-[3%] flex-1">
              <ILabel>เลขที่หนังสือเดินทาง (Passport ID)</ILabel>
              <IBox mono>{data.passport_number || "-"}</IBox>
            </div>
          </div>

          <div className="flex gap-[3%]">
            <div className="flex flex-col gap-[3%] flex-[1.2]">
              <ILabel>วันเดือนปีเกิด / DOB</ILabel>
              <IBox>{getDobText()}</IBox>
            </div>
            <div className="flex flex-col gap-[3%] flex-[0.8]">
              <ILabel>เพศ/อายุ</ILabel>
              <IBox>{data.gender || "-"}{data.age ? ` (${data.age})` : ""}</IBox>
            </div>
            <div className="flex flex-col gap-[3%] flex-1">
              <ILabel>สัญชาติ</ILabel>
              <IBox>
                <div className="flex items-center gap-1.5">
                  {flagUrl && <img src={flagUrl} alt="flag" className="w-4.5 h-3.25 object-cover rounded-xs shadow-sm" />}
                  <span className="truncate">{data.nationality || "-"}</span>
                </div>
              </IBox>
            </div>
          </div>

          <div className="flex flex-col gap-[2%]">
            <ILabel>สถานที่พบตัว</ILabel>
            <IBox noTruncate>
              <div className="truncate">{getLocationText()}</div>
            </IBox>
          </div>

          <div className="flex flex-col gap-[2%] flex-1 mb-1">
            <ILabel>ข้อมูลเพิ่มเติม (Additional Info)</ILabel>
            <IBox noTruncate className="h-full justify-start! text-left pt-[2%] overflow-hidden">
              <div className="flex flex-col gap-y-1.5 w-full" style={{ fontSize: "0.95em" }}>
                <div className="wrap-break-word"><span className="font-semibold text-emerald-950">วันที่สูญหาย:</span> {formatDate(data.missing_date)} {data.missing_time ? `เวลา ${data.missing_time}` : ""}</div>
                <div className="wrap-break-word"><span className="font-semibold text-emerald-950">รับแจ้งเมื่อ:</span> {formatDate(data.reported_date)}</div>
                <div className="wrap-break-word"><span className="font-semibold text-emerald-950">สน.ที่รับแจ้ง:</span> {data.police_station || "-"}</div>
                <div className="wrap-break-word"><span className="font-semibold text-emerald-950">พฤติการณ์:</span> {data.incident_summary || "-"}</div>
                <div className="wrap-break-word"><span className="font-semibold text-emerald-950">ผู้แจ้ง:</span> {informantFullNameTh || "ไม่ระบุ"} (โทร: {data.informant_phone || "-"}, ความเกี่ยวข้อง: {data.relationship || "-"})</div>
              </div>
            </IBox>
          </div>

        </div>

        <div className="flex flex-col items-center shrink-0" style={{ width: "30%" }}>
          <div className="bg-white border border-emerald-200 rounded-xl flex items-end justify-center overflow-hidden shadow-inner relative w-full mb-[5%]" style={{ aspectRatio: "3/4" }}>
            {data.photo_url ? (
               <img 
                 src={getDirectImageUrl(data.photo_url)} 
                 alt="Profile" 
                 className="w-full h-full object-cover" 
                 referrerPolicy="no-referrer"
               />
            ) : (
              <div className="flex flex-col items-center justify-end w-full h-full pb-[8%]">
                <img src={"/return.png"} className="opacity-40 w-1/2" alt="Placeholder"></img>
              </div>
            )}
          </div>

          <span className={`w-full text-center ${victimColorClass} font-bold border rounded-full px-2 py-1 mb-[5%] flex items-center justify-center`} style={{ fontSize: "clamp(8px, 1.1vw, 12px)" }}>
            <span>{victimStatusStr}</span>
          </span>

          <div className="w-full flex flex-col items-center gap-[6%]">
            <ILabel>วันที่พบตัว</ILabel>
            <IBox className="w-full flex justify-center text-center font-bold">{dateValue}</IBox>
          </div>
        </div>

      </div>
    </div>
  );
}

function ILabel({ children, className = "" }: { children: React.ReactNode; className?: string; }) {
  return <span className={`font-bold text-emerald-950 ${className}`} style={{ fontSize: "clamp(5px, 1.2vw, 11px)" }}>{children}</span>;
}

function IBox({ children, mono = false, noTruncate = false, className = "" }: { children: React.ReactNode; mono?: boolean; noTruncate?: boolean; className?: string; }) {
  return (
    <div className={`bg-[#B8E8D4] rounded-md text-emerald-900 font-medium ${mono ? "font-mono tracking-tight" : ""} ${noTruncate ? "flex flex-col justify-center" : "truncate"} ${className}`} style={{ fontSize: "clamp(6px, 1.3vw, 12px)", padding: "2.5% 4%" }}>
      {children}
    </div>
  );
}