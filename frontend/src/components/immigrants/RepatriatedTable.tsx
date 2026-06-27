"use client";

import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export type SortField = "name" | "date_of_birth" | "national_id" | "address" | "return_date" | "result";

interface RepatriatedTableProps {
  data: any[];
  sortField: SortField | null;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
}

export default function RepatriatedTable({ data, sortField, sortDirection, onSort }: RepatriatedTableProps) {
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
      {/* เพิ่ม table-fixed ล็อคขนาดตาราง */}
      <table className="w-full text-left border-collapse text-sm table-fixed">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--wrapper)" }}>
            <Th field="name" width="w-[20%]">ชื่อ-สกุล</Th>
            <Th field="date_of_birth" width="w-[15%]">วัน/เดือน/ปีเกิด</Th>
            <Th field="national_id" width="w-[20%]">เลขประจำตัว</Th>
            <Th field="address" width="w-[20%]">ที่อยู่</Th>
            <Th field="return_date" width="w-[15%]">วันที่ส่งกลับ</Th>
            <Th field="result" width="w-[10%]">สถานะ</Th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((person) => {
              const fullName = `${person.first_name_th} ${person.last_name_th}`;
              const nationalId = person.national_id || person.passport_id || "ไม่ระบุ";
              const address = person.address || "ไม่ระบุสถานที่";

              return (
                <tr
                  key={person.id}
                  onClick={() => router.push(`/immigrants/${person.id}`)}
                  className="cursor-pointer transition-colors"
                  style={{ backgroundColor: "var(--background)", borderBottom: "1px solid var(--wrapper)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--row-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--background)")}
                >
                  {/* เปลี่ยนเป็น truncate ทั้งหมดและใส่ title ให้ hover ดูข้อความเต็มได้ */}
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }} title={fullName}>
                    {fullName}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }}>
                    {person.date_of_birth ? new Date(person.date_of_birth).toLocaleDateString("th-TH", { day: '2-digit', month: '2-digit', year: 'numeric' }) : "ไม่ระบุ"}
                    {person.age ? ` (${person.age} ปี)` : ""}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }} title={nationalId}>
                    {nationalId}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }} title={address}>
                    {address}
                  </td>
                  <td className="px-4 py-3 border-r truncate" style={{ borderColor: "var(--wrapper)" }}>
                    {person.return_date ? new Date(person.return_date).toLocaleDateString("th-TH") : "รอการส่งกลับ"}
                  </td>
                  <td className="px-4 py-3 font-medium truncate">
                    {person.result === "SUCCESS" && <span style={{ color: "var(--greenText)" }}>สำเร็จ</span>}
                    {person.result === "FAILED" && <span style={{ color: "var(--redText)" }}>ล้มเหลว</span>}
                    {(!person.result || person.result === "PENDING") && <span style={{ color: "var(--yellowText)" }}>รอดำเนินการ</span>}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center" style={{ color: "var(--foreground)", opacity: 0.5 }}>ไม่พบข้อมูล</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}