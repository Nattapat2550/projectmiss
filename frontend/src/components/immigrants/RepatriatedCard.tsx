import React from "react";

interface RepatriatedCardProps {
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

export default function RepatriatedCard({ data }: RepatriatedCardProps) {
  const fullNameTh = `${data.first_name_th}${data.middle_name_th ? " " + data.middle_name_th : ""} ${data.last_name_th}`;
  const fullNameEn = data.first_name_en
    ? `${data.first_name_en}${data.middle_name_en ? " " + data.middle_name_en : ""} ${data.last_name_en ?? ""}`.trim()
    : "";

  const formatId = (id: string): string => {
    if (!id || id.length < 13) return id || "-";
    return id.replace(/^(\d)(\d{4})(\d{5})(\d{2})(\d)$/, "$1-$2-$3-$4-$5");
  }

  return (
    <div
      className="relative w-full bg-[#C8E8F5] rounded-2xl border border-[#9DCFE8] shadow-md overflow-hidden font-sans"
      style={{ aspectRatio: "856 / 540" }}
    >
      <div className="absolute inset-0 flex flex-col p-[4%]">
        <div className="flex items-start justify-between mb-[3%]">
          <div className="flex items-center gap-[3%]">
            <div className="bg-white rounded-full shrink-0 shadow-inner overflow-hidden" style={{ width: "11%", aspectRatio: "1/1" }} >
            <img src={"/return.png"} className="translate-y-[-0px]"></img>
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-tight" style={{ fontSize: "clamp(10px, 3.2vw, 28px)" }}>ผู้ถูกส่งตัวกลับ</p>
              <p className="text-slate-700 font-medium" style={{ fontSize: "clamp(7px, 1.6vw, 14px)" }}>เลขประจำตัวประชาชน</p>
            </div>
          </div>

          <div className="bg-[#A8D8EA] rounded-xl font-mono font-bold text-slate-900 flex items-center justify-center tracking-widest shadow-sm" style={{ fontSize: "clamp(8px, 2vw, 18px)", padding: "1.5% 3%", minWidth: "36%" }}>
            {formatId(data.national_id)}
          </div>
        </div>

        <div className="flex flex-1 gap-[3%] min-h-0">
          <div className="flex flex-col flex-1 gap-[3%] min-w-0">
            <FieldRow label="ชื่อ-นามสกุล"><FieldBox>{fullNameTh}</FieldBox></FieldRow>
            <FieldRow label=""><FieldBox>{fullNameEn}</FieldBox></FieldRow>

            <div className="flex items-center gap-[2%]">
              <span className="text-slate-800 font-semibold whitespace-nowrap shrink-0" style={{ fontSize: "clamp(6px, 1.5vw, 13px)", width: "28%" }}>วันเดือนปีเกิด</span>
              <FieldBox mono className="flex-1">{data.date_of_birth || "-"}</FieldBox>
              <span className="text-slate-800 font-semibold shrink-0" style={{ fontSize: "clamp(6px, 1.5vw, 13px)" }}>อายุ</span>
              <FieldBox mono className="w-[14%] text-center">{data.age ?? "-"}</FieldBox>
              <span className="text-slate-800 font-semibold shrink-0" style={{ fontSize: "clamp(6px, 1.5vw, 13px)" }}>ปี</span>
            </div>

            <FieldRow label="เลขพาสปอร์ต"><FieldBox>{data.passport_id ?? "-"}</FieldBox></FieldRow>

            <div className="flex flex-1 gap-[2%] min-h-0">
              <span className="text-slate-800 font-semibold whitespace-nowrap shrink-0 pt-[1%]" style={{ fontSize: "clamp(6px, 1.5vw, 13px)", width: "28%" }}>ที่อยู่</span>
              <div className="flex-1 bg-white rounded-lg border border-slate-300 min-h-0 overflow-y-auto" style={{ padding: "2% 3%" }}>
                <span className="text-slate-900 font-medium" style={{ fontSize: "clamp(6px, 1.4vw, 12px)" }}>{data.address || "-"}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 bg-white border border-slate-300 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner self-start mt-[1%]" style={{ width: "21%", aspectRatio: "3/4" }}>
            {data.photo_url ? (
              <img 
                src={getDirectImageUrl(data.photo_url)} 
                alt="Profile" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer" /* กุญแจสำคัญในการเลี่ยงการบล็อก */
              />
            ) : (
              <>
                <div className="flex flex-col items-center justify-end w-full h-full pb-[8%]">
                  <div className="bg-[#BDBDBD] rounded-full" style={{ width: "42%", aspectRatio: "1/1", marginBottom: "4%" }} />
                  <div className="bg-[#BDBDBD] rounded-t-full" style={{ width: "72%", height: "38%" }} />
                </div>
                <span className="absolute top-[4%] right-[8%] text-slate-300 font-light leading-none" style={{ fontSize: "clamp(8px, 2vw, 18px)" }}>?</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-[2%]">
      <span className="text-slate-800 font-semibold whitespace-nowrap shrink-0" style={{ fontSize: "clamp(6px, 1.5vw, 13px)", width: "28%" }}>{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
function FieldBox({ children, mono = false, className = "" }: { children: React.ReactNode; mono?: boolean; className?: string; }) {
  return (
    <div className={`bg-white rounded-lg border border-slate-300 text-slate-900 font-semibold truncate ${mono ? "font-mono" : ""} ${className}`} style={{ fontSize: "clamp(6px, 1.5vw, 13px)", padding: "2% 4%" }}>
      {children}
    </div>
  );
}