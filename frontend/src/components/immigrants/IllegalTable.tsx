"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortField = "name" | "nationality" | "detected_date" | "detected_location" | "is_victim";

interface IllegalTableProps {
  data: any[];
  sortField: SortField | null;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
}

export default function IllegalTable({ data, sortField, sortDirection, onSort }: IllegalTableProps) {
  const router = useRouter();

  // เพิ่ม props width เพื่อกำหนดความกว้างคอลัมน์
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
      {/* เพิ่ม table-fixed เพื่อล็อคความกว้าง */}
      <table className="w-full text-left border-collapse text-sm table-fixed">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--wrapper)" }}>
            <Th field="name" width="w-[25%]">ชื่อ - นามสกุล</Th>
            <Th field="nationality" width="w-[15%]">สัญชาติ</Th>
            <Th field="detected_date" width="w-[20%]">วันที่ตรวจพบ</Th>
            <Th field="detected_location" width="w-[25%]">สถานที่ตรวจพบ</Th>
            <Th field="is_victim" width="w-[15%]">สถานะผู้เสียหาย</Th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((person) => {
              const fullName = `${person.first_name_th} ${person.last_name_th}`;
              return (
              <tr
                key={person.id}
                onClick={() => router.push(`/immigrants/${person.id}`)}
                className="cursor-pointer transition-colors"
                style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--wrapper)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--row-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--background)")}
              >
                <td className="px-4 py-3 truncate border-r" style={{ borderColor: "var(--wrapper)" }} title={fullName}>
                  {fullName}
                </td>
                <td className="px-4 py-3 truncate border-r" style={{ borderColor: "var(--wrapper)" }} title={person.nationality || "ไม่ระบุ"}>
                  {person.nationality || "ไม่ระบุ"}
                </td>
                <td className="px-4 py-3 truncate border-r" style={{ borderColor: "var(--wrapper)" }}>
                  {person.detected_date ? new Date(person.detected_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}
                </td>
                <td className="px-4 py-3 truncate border-r" style={{ borderColor: "var(--wrapper)" }} title={person.detected_location || "ไม่ระบุสถานที่"}>
                  {person.detected_location || "ไม่ระบุสถานที่"}
                </td>
                <td className="px-4 py-3 truncate">
                  {person.is_victim ? <span style={{ color: "var(--redText)" }}>เป็นผู้เสียหาย</span> : <span>ไม่ใช่</span>}
                </td>
              </tr>
            )})
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center" style={{ color: "var(--foreground)", opacity: 0.5 }}>ไม่พบข้อมูล</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}