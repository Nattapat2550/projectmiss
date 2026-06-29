"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortField = "name" | "nationality" | "age" | "gender" | "missing_id_card_passport" | "missing_location" | "missing_date" | "status";

interface MissingTableProps {
  data: any[];
  sortField: SortField | null;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
}

export default function MissingTable({ data, sortField, sortDirection, onSort }: MissingTableProps) {
  const router = useRouter();

  const Th = ({ field, width, children }: { field: SortField; width?: string; children: React.ReactNode }) => (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-3 text-left font-semibold cursor-pointer select-none truncate border-r last:border-r-0 ${width || ""}`}
      style={{ backgroundColor: "var(--container)", color: "var(--foreground)", borderColor: "var(--wrapper)" }}
      title={children as string}
    >
      <div className="flex items-center gap-1 truncate">
        <span className="truncate">{children}</span>
        {sortField === field ? (
          sortDirection === "asc" ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-40" />
        )}
      </div>
    </th>
  );

  return (
    <div className="w-full overflow-hidden rounded-sm" style={{ border: "1px solid var(--wrapper)" }}>
      <table className="w-full text-left border-collapse text-sm table-fixed">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--wrapper)" }}>
            <Th field="name" width="w-[20%]">ชื่อ - นามสกุล</Th>
            <Th field="nationality" width="w-[12%]">สัญชาติ</Th>
            <Th field="age" width="w-[8%]">อายุ</Th>
            <Th field="gender" width="w-[8%]">เพศ</Th>
            <Th field="missing_id_card_passport" width="w-[15%]">เลขประจำตัว/พาสปอร์ต</Th>
            <Th field="missing_location" width="w-[20%]">สถานที่สูญหายล่าสุด</Th>
            <Th field="missing_date" width="w-[10%]">วันที่รับแจ้ง</Th>
            <Th field="status" width="w-[12%]">สถานะ</Th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((person, index) => {
              let fullName = "ไม่ระบุชื่อ";
              
              if (person.first_name_th || person.last_name_th) {
                fullName = `${person.first_name_th || ""} ${person.last_name_th || ""}`.trim();
              } else if (person.first_name_en || person.last_name_en) {
                fullName = `${person.first_name_en || ""} ${person.last_name_en || ""}`.trim();
              }

              const idCard = person.missing_id_card_passport || person.passport_number || person.passport_id || "ไม่ระบุ";
              const location = person.detected_location_province || person.address || person.detected_location_details || "ไม่ระบุสถานที่";
              const missingDate = person.missing_date || person.detected_date;
              const foundDate = person.found_date || person.return_date;

              return (
                <tr
                  key={person.case_id || `${person.missing_person_id}-${index}`}
                  onClick={() => router.push(`/missing/${person.missing_person_id}`)}
                  className="cursor-pointer transition-colors"
                  style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--wrapper)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--row-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--background)")}
                >
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }} title={fullName}>
                    {fullName}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }}>
                    {person.nationality || "ไม่ระบุ"}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }}>
                    {person.age ? `${person.age} ปี` : "-"}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }}>
                    {person.gender || "-"}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }} title={idCard}>
                    {idCard}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }} title={location}>
                    {location}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }}>
                    {missingDate ? new Date(missingDate).toLocaleDateString("th-TH") : "ไม่ระบุ"}
                  </td>
                  <td className="px-4 py-3 truncate">
                    {foundDate ? (
                      <span className="text-(--greenText)">พบตัวแล้ว</span>
                    ) : (
                      <span className="text-(--redText)">ยังไม่พบตัว</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={8} className="px-4 py-10 text-center" style={{ color: "var(--foreground)", opacity: 0.5 }}>ไม่พบข้อมูล</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}