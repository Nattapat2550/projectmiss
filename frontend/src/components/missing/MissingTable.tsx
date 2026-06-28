"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortField = "name" | "missing_date" | "missing_id_card_passport" | "missing_location";

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
      className={`px-4 py-3 text-left font-semibold cursor-pointer select-none truncate border-r border-(--wrapper) last:border-r-0 bg-(--container) text-foreground ${width || ""}`}
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
    <div className="w-full overflow-hidden rounded-sm border border-(--wrapper)">
      <table className="w-full text-left border-collapse text-sm table-fixed">
        <thead>
          <tr className="border-b border-(--wrapper)">
            <Th field="name" width="w-[20%]">ชื่อ-สกุล</Th>
            <Th field="missing_id_card_passport" width="w-[15%]">อายุ / เพศ</Th>
            <Th field="missing_id_card_passport" width="w-[20%]">เลขประจำตัว/พาสปอร์ต</Th>
            <Th field="missing_location" width="w-[25%]">สถานที่สูญหายล่าสุด</Th>
            <Th field="missing_date" width="w-[10%]">วันที่สูญหาย</Th>
            <Th field="name" width="w-[10%]">สถานะ</Th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((person, index) => {
              const fullName = person.missing_person_name || "ไม่ระบุชื่อ";
              const idCard = person.missing_id_card_passport || person.passport_number || "ไม่ระบุ";
              const location = person.missing_location || person.last_seen_location_province || "ไม่ระบุสถานที่";

              return (
                <tr
                  key={person.case_id || `${person.missing_person_id}-${index}`}
                  onClick={() => router.push(`/missing/${person.missing_person_id}`)}
                  className="cursor-pointer transition-colors border-b border-(--wrapper) bg-background hover:bg-(--row-hover)"
                >
                  <td className="px-4 py-3 border-r border-(--wrapper) truncate" title={fullName}>
                    {fullName}
                  </td>
                  <td className="px-4 py-3 border-r border-(--wrapper) truncate">
                    {person.age ? `${person.age} ปี` : "-"} / {person.gender || "-"}
                  </td>
                  <td className="px-4 py-3 border-r border-(--wrapper) truncate" title={idCard}>
                    {idCard}
                  </td>
                  <td className="px-4 py-3 border-r border-(--wrapper) truncate" title={location}>
                    {location}
                  </td>
                  <td className="px-4 py-3 border-r border-(--wrapper) truncate">
                    {person.missing_date ? new Date(person.missing_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}
                  </td>
                  <td className="px-4 py-3 font-medium truncate">
                    {person.found_date ? (
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
              <td colSpan={6} className="px-4 py-10 text-center text-foreground opacity-50">ไม่พบข้อมูล</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}