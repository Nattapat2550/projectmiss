import React from "react";

interface InformantCardProps {
  data: any; 
}

export default function InformantCard({ data }: InformantCardProps) {
  const fullNameTh = `${data.informant_first_name_th || ""}${data.informant_middle_name_th ? " " + data.informant_middle_name_th : ""} ${data.informant_last_name_th || ""}`.trim();
  const fullNameEn = data.informant_first_name_en
    ? `${data.informant_first_name_en}${data.informant_middle_name_en ? " " + data.informant_middle_name_en : ""} ${data.informant_last_name_en ?? ""}`.trim()
    : "";

  return (
    <div className="relative w-full bg-[#E6F3FF] rounded-2xl border border-[#B3DAFF] shadow-md overflow-hidden font-sans" style={{ aspectRatio: "856 / 300" }}>
      <div className="absolute inset-0 flex p-[4%] gap-[4%]">
        
        {/* คอลัมน์ซ้าย (รูปภาพและป้ายสัญชาติ) */}
        <div className="flex flex-col items-center shrink-0 justify-center" style={{ width: "25%" }}>
          <div className="bg-white border border-blue-200 rounded-full flex items-center justify-center overflow-hidden shadow-inner relative w-3/4" style={{ aspectRatio: "1/1" }}>
            <img src={"/return.png"} className="opacity-40 w-1/2"></img>
          </div>
          <p className="font-bold text-blue-900 text-center leading-tight mt-[8%]" style={{ fontSize: "clamp(8px, 2vw, 16px)" }}>ผู้แจ้ง</p>
        </div>

        {/* คอลัมน์ขวา (รายละเอียดข้อมูล) */}
        <div className="flex flex-col flex-1 gap-[4%] min-w-0 justify-center">
          
          <div className="flex flex-col gap-[4%] mb-2">
            <ILabel>ชื่อ - นามสกุล (ผู้แจ้ง)</ILabel>
            <IBox noTruncate>
              <div className="truncate">{fullNameTh || "ไม่ระบุชื่อ"}</div>
              {fullNameEn && <div className="truncate text-[0.82em] opacity-75 font-normal tracking-wide mt-[0.5%]">{fullNameEn}</div>}
            </IBox>
          </div>

          <div className="flex gap-[4%]">
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>ความสัมพันธ์</ILabel>
              <IBox>{data.relationship || "-"}</IBox>
            </div>
            <div className="flex flex-col gap-[6%] flex-1">
              <ILabel>เบอร์โทรศัพท์</ILabel>
              <IBox mono>{data.informant_phone || "-"}</IBox>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ILabel({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-blue-950" style={{ fontSize: "clamp(5px, 1.3vw, 11px)" }}>{children}</span>;
}
function IBox({ children, mono = false, noTruncate = false }: { children: React.ReactNode; mono?: boolean; noTruncate?: boolean; }) {
  return (
    <div className={`bg-[#CCE5FF] rounded-md text-blue-900 font-medium ${mono ? "font-mono" : ""} ${noTruncate ? "flex flex-col justify-center" : "truncate"}`} style={{ fontSize: "clamp(6px, 1.5vw, 13px)", padding: "4% 6%", minHeight: "18%" }}>
      {children}
    </div>
  );
}
