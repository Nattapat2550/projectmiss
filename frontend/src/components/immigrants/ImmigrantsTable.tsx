"use client";

import TableHeader from "./TableHeader";
import TableRow from "./TableRow";
import { useTableSort } from "@/hooks/useTableSort"; // 🟢 ดึง hook ใหม่มาใช้ (แก้ไข path ตามจริง)

interface ImmigrantsTableProps {
  data: any[]; 
  isMock: boolean;
  type: "repatriated" | "illegal";
}

export default function ImmigrantsTable({ data, isMock, type }: ImmigrantsTableProps) {
  // 🟢 ย้ายตรรกะทั้งหมดออกไปใน Custom Hook
  const { sortField, sortDirection, handleSort, sortedData } = useTableSort(data);

  return (
    <div className="w-full border rounded-lg shadow-sm overflow-hidden" style={{ borderColor: "var(--wrapper)" }}>
      <table className="w-full text-left text-sm table-fixed whitespace-nowrap [&_td]:truncate [&_th]:truncate [&_td]:max-w-0 [&_th]:max-w-0">
        <TableHeader 
          sortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
          type={type} 
        />
        <tbody className="divide-y bg-background" style={{ borderColor: "var(--wrapper)" }}>
          {sortedData.length > 0 ? (
            sortedData.map((person) => (
              <TableRow key={person.id} person={person} isMock={isMock} type={type} />
            ))
          ) : (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                ไม่พบข้อมูลในตาราง
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}