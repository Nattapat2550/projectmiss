import React, { createContext, useContext, useState, useEffect } from "react";

interface MissingCardProps {
  data: any; 
  isExporting?: boolean;
}

const ExportContext = createContext<boolean>(false);

const getDirectImageUrl = (url: string, uniqueId?: string) => {
  if (!url) return "";
  let driveId = "";
  
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    driveId = matchFileD[1];
  } else {
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) {
      driveId = matchId[1];
    }
  }

  if (driveId) {
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
    let proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(thumbnailUrl)}`;
    if (uniqueId) proxyUrl += `&_id=${uniqueId}`;
    return proxyUrl;
  }
  
  // For other external URLs, proxy them as well if they might have CORS issues
  if (url.startsWith("http")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
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

const Base64Image = ({ src, alt, className, crossOrigin, referrerPolicy }: any) => {
  const [base64, setBase64] = useState<string>(src);
  
  useEffect(() => {
    if (!src || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')) {
      setBase64(src);
      return;
    }
    let isMounted = true;
    fetch(src)
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && reader.result) {
            setBase64(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => {
        console.error("Failed to load image as base64", err);
      });
      
    return () => { isMounted = false; };
  }, [src]);

  return <img src={base64} alt={alt} className={className} crossOrigin={crossOrigin} referrerPolicy={referrerPolicy} />;
};

export default function MissingCard({ data, isExporting = false }: MissingCardProps) {
  if (!data) return null;

  const flagUrl = getFlagUrl(data.nationality);

  const fNameTh = data.missing_first_name_th || data.first_name_th || "";
  const mNameTh = data.missing_middle_name_th || data.middle_name_th || "";
  const lNameTh = data.missing_last_name_th || data.last_name_th || "";
  const fullNameTh = `${fNameTh}${mNameTh ? " " + mNameTh : ""} ${lNameTh}`.trim();

  const fNameEn = data.missing_first_name_en || data.first_name_en || "";
  const mNameEn = data.missing_middle_name_en || data.middle_name_en || "";
  const lNameEn = data.missing_last_name_en || data.last_name_en || "";
  const fullNameEn = fNameEn ? `${fNameEn}${mNameEn ? " " + mNameEn : ""} ${lNameEn}`.trim() : "";

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
  let victimColorClass = "text-[#a16207] bg-[#fef9c3] border-[#facc15]";

  if (data.human_trafficking_indicators === true || data.human_trafficking_indicators === "YES" || data.human_trafficking_indicators === "true") {
    victimStatusStr = "เป็นผู้เสียหาย";
    victimColorClass = "text-[#b91c1c] bg-[#fee2e2] border-[#f87171]";
  } else if (data.human_trafficking_indicators === false || data.human_trafficking_indicators === "NO" || data.human_trafficking_indicators === "false") {
    victimStatusStr = "ไม่เป็นผู้เสียหาย";
    victimColorClass = "text-[#15803d] bg-[#dcfce7] border-[#4ade80]";
  }

  const informantFullNameTh = `${data.informant_first_name_th || ""}${data.informant_middle_name_th ? " " + data.informant_middle_name_th : ""} ${data.informant_last_name_th || ""}`.trim();

  if (isExporting) {
    return (
      <ExportContext.Provider value={isExporting}>
        <div className="relative w-full rounded-[12px] shadow-sm overflow-hidden font-sans flex flex-col text-[#002f6c] mb-6" style={{ minHeight: '520px', backgroundColor: '#eef2f5', border: '1px solid #d1d5db', maxWidth: '800px', margin: '0 auto' }}>
          
          <div className="w-full bg-[#0047a5] text-white py-[2%] px-[4%] flex items-center shrink-0">
            <div className="flex flex-col">
              <span className="font-bold tracking-wide leading-tight" style={{ fontSize: "26px" }}>
                บันทึกข้อมูลผู้สูญหาย
              </span>
              <span className="opacity-80" style={{ fontSize: "14px" }}>
                MISSING PERSON RECORD
              </span>
            </div>
            <div className="ml-auto text-right">
               <span className="font-bold opacity-90" style={{ fontSize: "20px" }}>{data.id_card_passport || data.missing_id_card_passport ? formatNationalId(data.id_card_passport || data.missing_id_card_passport) : "-"}</span>
            </div>
          </div>

          <div className="flex p-[4%] flex-1 bg-[#f3f4f6]">
            
            <div className="flex flex-col flex-1 pr-[3%] min-w-0 justify-between">
               <div className="flex gap-2 w-full">
                 <div className="w-1/2">
                   <InfoItem label="ชื่อ-นามสกุล / Name (TH)" value={fullNameTh} />
                 </div>
                 <div className="w-1/2">
                   <InfoItem label="Name (EN)" value={fullNameEn} />
                 </div>
               </div>

               <div className="flex gap-2 w-full mt-2">
                 <div className="w-[35%]">
                   <InfoItem label="เกิดวันที่ / Date of Birth" value={getDobText()} />
                 </div>
                 <div className="w-[20%]">
                   <InfoItem label="เพศ / Sex" value={data.gender} />
                 </div>
                 <div className="w-[45%]">
                   <InfoItem label="หนังสือเดินทาง / Passport No." value={data.passport_number} />
                 </div>
               </div>

               <div className="flex gap-2 w-full mt-2">
                 <div className="w-full">
                   <div className="flex flex-col items-start min-w-0">
                     <span className="text-[#0047a5] font-bold" style={{ fontSize: "14px" }}>สัญชาติ / Nationality</span>
                     <div className="flex items-center gap-1.5 mt-0.5">
                       {flagUrl && <img src={flagUrl} alt="flag" crossOrigin="anonymous" className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm" />}
                       <span className="font-bold text-[#002f6c] truncate" style={{ fontSize: "16px" }}>{data.nationality || "-"}</span>
                     </div>
                   </div>
                 </div>
               </div>
               
               <div className="flex gap-2 w-full mt-2">
                 <div className="w-full">
                   <InfoItem label="สถานที่พบตัว / Found Location" value={getLocationText()} />
                 </div>
               </div>

               <div className="flex gap-2 w-full mt-2">
                 <div className="w-full flex flex-col items-start min-w-0">
                    <span className="text-[#0047a5] font-bold mb-0.5" style={{ fontSize: "14px" }}>สถานะผู้เสียหาย / Victim Status</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-center border ${victimColorClass}`} style={{ fontSize: "15px" }}>
                      {victimStatusStr}
                    </span>
                 </div>
               </div>
               
               {/* ข้อมูลเพิ่มเติม (Additional Info) */}
               <div className="flex gap-2 w-full mt-2 shrink-0 pb-1">
                 <div className="w-full flex flex-col items-start min-w-0">
                    <span className="text-[#0047a5] font-bold mb-0.5" style={{ fontSize: "14px" }}>ข้อมูลเพิ่มเติม / Additional Info</span>
                    <div className="text-[#002f6c] w-full" style={{ fontSize: "14px", lineHeight: "1.3" }}>
                      <div className="flex flex-col gap-y-1 w-full">
                        <div className="flex gap-2">
                          <div className="truncate flex-1"><span className="font-bold">วันที่สูญหาย:</span> {formatDate(data.missing_date)} {data.missing_time ? `เวลา ${data.missing_time}` : ""}</div>
                          <div className="truncate flex-1"><span className="font-bold">รับแจ้งเมื่อ:</span> {formatDate(data.reported_date)}</div>
                        </div>
                        <div className="flex gap-2">
                          <div className="truncate flex-1"><span className="font-bold">สน.ที่รับแจ้ง:</span> {data.police_station || "-"}</div>
                          <div className="truncate flex-1"><span className="font-bold">ผู้แจ้ง:</span> {informantFullNameTh || "-"} {data.informant_relation ? `(${data.informant_relation})` : ""}</div>
                        </div>
                        <div className="truncate w-full"><span className="font-bold">พฤติการณ์:</span> {data.incident_summary || "-"}</div>
                      </div>
                    </div>
                 </div>
               </div>
            </div>

            <div className="flex flex-col items-center justify-start shrink-0 w-[22%] h-full">
               <div className="w-full bg-[#f8fafc] border-2 border-[#e2e8f0] rounded-[6px] overflow-hidden flex items-center justify-center relative shadow-sm" style={{ aspectRatio: "3/4" }}>
                  {data.photo_url ? (
                     <Base64Image 
                       src={getDirectImageUrl(data.photo_url, data.id || data.missing_person_id || Math.random().toString())} 
                       alt="Profile" 
                       className="w-full h-full object-cover relative z-10" 
                       referrerPolicy="no-referrer"
                       crossOrigin="anonymous"
                     />
                  ) : (
                     <div className="flex flex-col items-center justify-center w-full h-full relative z-10 bg-[#eef6fc]">
                       <img src={"/return.png"} className="opacity-40 w-[60%]" alt="Placeholder"></img>
                     </div>
                  )}
               </div>

               <div className="w-full text-center mt-auto pt-2 shrink-0">
                 <div className="text-[#0047a5] font-bold leading-tight" style={{ fontSize: "15px" }}>วันที่พบตัว / Date</div>
                 <div className="text-[#002f6c] font-bold mt-1" style={{ fontSize: "18px" }}>{dateValue}</div>
               </div>
            </div>
          </div>
        </div>
      </ExportContext.Provider>
    );
  }

  return (
    <ExportContext.Provider value={isExporting}>
      <div className="relative w-full bg-[#DFF5EC] rounded-2xl border border-[#9DD8BE] shadow-md overflow-hidden font-sans pt-[6%] mb-6" style={{ aspectRatio: "856 / 540" }}>
        
        <div className="absolute top-[3%] left-0 w-full text-center">
          <p className="font-bold text-[#022c22] tracking-wide" style={{ fontSize: isExporting ? "24px" : "clamp(12px, 2.8vw, 24px)" }}>
            ผู้สูญหาย
          </p>
        </div>

      <div className="absolute inset-0 top-[11%] flex p-[4%] pt-0">
        
        {/* คอลัมน์ซ้าย (รายละเอียดข้อมูล) */}
        <div className="flex flex-col min-w-0" style={{ width: "67%", marginRight: "3%" }}>
          
          {/* แถว 1: ชื่อ-นามสกุล (แยกกล่อง ไทย - อังกฤษ) */}
          <div className="flex justify-between w-full" style={{ marginBottom: "2%" }}>
            <div className="flex flex-col" style={{ width: "48.5%" }}>
              <ILabel>ชื่อ - นามสกุล</ILabel>
              <IBox>{fullNameTh || "-"}</IBox>
            </div>
            <div className="flex flex-col" style={{ width: "48.5%" }}>
              <ILabel>Name</ILabel>
              <IBox>{fullNameEn || "-"}</IBox>
            </div>
          </div>

          {/* แถว 2: เลขที่บัตร */}
          <div className="flex justify-between w-full" style={{ marginBottom: "2%" }}>
            <div className="flex flex-col" style={{ width: "48.5%" }}>
              <ILabel>เลขประจำตัวประชาชน</ILabel>
              <IBox mono>{formatNationalId(data.missing_id_card_passport || data.id_card_passport) || "-"}</IBox>
            </div>
            <div className="flex flex-col" style={{ width: "48.5%" }}>
              <ILabel>เลขที่หนังสือเดินทาง (Passport ID)</ILabel>
              <IBox mono>{data.passport_number || "-"}</IBox>
            </div>
          </div>

          {/* แถว 3: วันเกิด / เพศ-อายุ / สัญชาติ */}
          <div className="flex w-full" style={{ marginBottom: "2%" }}>
            <div className="flex flex-col" style={{ width: "37.6%", marginRight: "3%" }}>
              <ILabel>วันเดือนปีเกิด / DOB</ILabel>
              <IBox>{getDobText()}</IBox>
            </div>
            <div className="flex flex-col" style={{ width: "25.1%", marginRight: "3%" }}>
              <ILabel>เพศ/อายุ</ILabel>
              <IBox>{data.gender || "-"}{data.age ? ` (${data.age})` : ""}</IBox>
            </div>
            <div className="flex flex-col" style={{ width: "31.3%" }}>
              <ILabel>สัญชาติ</ILabel>
              <IBox>
                <div className="flex items-center gap-1.5">
                  {flagUrl && <img src={flagUrl} alt="flag" crossOrigin="anonymous" className="w-4.5 h-3.25 object-cover rounded-xs shadow-sm" />}
                  <span className="truncate">{data.nationality || "-"}</span>
                </div>
              </IBox>
            </div>
          </div>

          {/* แถว 4: สถานที่ */}
          <div className="flex flex-col" style={{ marginBottom: "2%" }}>
            <ILabel>สถานที่พบตัว</ILabel>
            <IBox noTruncate>
              <div className="truncate">{getLocationText()}</div>
            </IBox>
          </div>

          {/* แถว 5: ข้อมูลอื่นๆ ทั้งหมดจาก Structure.md */}
          <div className="flex flex-col flex-1 mb-1">
            <ILabel>ข้อมูลเพิ่มเติม (Additional Info)</ILabel>
            <IBox noTruncate className="h-full justify-start! text-left overflow-hidden">
              <div className="flex flex-col gap-y-1.5 w-full" style={{ fontSize: "0.95em" }}>
                <div className="wrap-break-word"><span className="font-semibold text-[#022c22]">วันที่สูญหาย:</span> {formatDate(data.missing_date)} {data.missing_time ? `เวลา ${data.missing_time}` : ""}</div>
                <div className="wrap-break-word"><span className="font-semibold text-[#022c22]">รับแจ้งเมื่อ:</span> {formatDate(data.reported_date)}</div>
                <div className="wrap-break-word"><span className="font-semibold text-[#022c22]">สน.ที่รับแจ้ง:</span> {data.police_station || "-"}</div>
                <div className="wrap-break-word"><span className="font-semibold text-[#022c22]">พฤติการณ์:</span> {data.incident_summary || "-"}</div>
                <div className="wrap-break-word"><span className="font-semibold text-[#022c22]">ผู้แจ้ง:</span> {informantFullNameTh || "ไม่ระบุ"} (โทร: {data.informant_phone || "-"}, ความเกี่ยวข้อง: {data.relationship || "-"})</div>
              </div>
            </IBox>
          </div>

        </div>

        {/* คอลัมน์ขวา (รูปภาพ ไว้ฝั่งขวา) */}
        <div className="flex flex-col items-center shrink-0" style={{ width: "30%" }}>
          <div className="bg-white border border-[#a7f3d0] rounded-xl flex items-end justify-center overflow-hidden shadow-inner relative w-full mb-[5%]" style={{ aspectRatio: "3/4" }}>
            {data.photo_url ? (
               <Base64Image 
                 src={getDirectImageUrl(data.photo_url, data.id || data.missing_person_id || Math.random().toString())} 
                 alt="Profile" 
                 className="w-full h-full object-cover" 
                 referrerPolicy="no-referrer"
                 crossOrigin="anonymous"
               />
            ) : (
              <div className="flex flex-col items-center justify-end w-full h-full pb-[8%]">
                <img src={"/return.png"} className="opacity-40 w-1/2" alt="Placeholder"></img>
              </div>
            )}
          </div>

          {/* ป้ายสถานะผู้เสียหาย (ไม่มี Emoji) */}
          <span className={`w-full text-center ${victimColorClass} font-bold border rounded-full px-2 py-1 mb-[5%] flex items-center justify-center`} style={{ fontSize: isExporting ? "16px" : "clamp(8px, 1.1vw, 12px)" }}>
            <span>{victimStatusStr}</span>
          </span>

          {/* วันที่พบตัว (โชว์เด่นๆ ฝั่งขวาใต้รูป) */}
          <div className="w-full flex flex-col items-center">
            <div style={{ marginBottom: "4px" }}><ILabel>วันที่พบตัว</ILabel></div>
            <IBox className="w-full flex justify-center text-center font-bold">{dateValue}</IBox>
          </div>
        </div>

      </div>
    </div>
  </ExportContext.Provider>
  );
}

function ILabel({ children, className = "" }: { children: React.ReactNode; className?: string; }) {
  const isExporting = useContext(ExportContext);
  return <span className={`font-bold text-[#022c22] block mb-0.5 ${className}`} style={{ fontSize: isExporting ? "14px" : "clamp(5px, 1.2vw, 11px)" }}>{children}</span>;
}

function InfoItem({ label, value, colorClass }: { label: string; value?: string | number | null; colorClass?: string; }) {
  const isExporting = useContext(ExportContext);
  return (
    <div className="flex flex-col items-start min-w-0">
      <span className="text-[#0047a5] font-bold" style={{ fontSize: isExporting ? "14px" : "14px" }}>{label}</span>
      <span 
        className={`font-bold mt-0.5 leading-normal ${colorClass ? colorClass + ' px-2 py-0.5 rounded text-center border' : 'text-[#002f6c] truncate w-full'}`} 
        style={{ fontSize: isExporting ? "16px" : "16px", display: colorClass ? "inline-block" : "block", wordBreak: colorClass ? "break-word" : "normal", whiteSpace: colorClass ? "normal" : "nowrap" }}
      >
        {value || "-"}
      </span>
    </div>
  );
}

function IBox({ children, mono = false, noTruncate = false, className = "" }: { children: React.ReactNode; mono?: boolean; noTruncate?: boolean; className?: string; }) {
  const isExporting = useContext(ExportContext);
  return (
    <div className={`bg-[#B8E8D4] rounded-md text-[#064e3b] font-medium ${mono ? "font-mono tracking-tight" : ""} ${noTruncate ? "flex flex-col justify-center" : "truncate"} ${className}`} style={{ fontSize: isExporting ? "16px" : "clamp(6px, 1.3vw, 12px)", padding: isExporting ? "6px 10px" : "0.6em 0.8em", lineHeight: 1.5 }}>
      {children}
    </div>
  );
}