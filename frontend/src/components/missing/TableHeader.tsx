import { ChevronUp, ChevronDown } from "lucide-react";

export type SortField = "name" | "date_of_birth" | "detected_date" | "national_id" | "nationality" | "address" | "detected_location" | "is_victim" | "return_date" | "result";

interface TableHeaderProps {
  sortField: SortField | null;
  sortDirection: "asc" | "desc";
  onSort: (field: SortField) => void;
  type: "repatriated" | "illegal";
}

export default function TableHeader({ sortField, sortDirection, onSort, type }: TableHeaderProps) {
  
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="ml-1 w-4 inline-block text-transparent shrink-0">↕</span>;
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 w-4 h-4 inline-block text-foreground shrink-0" />
    ) : (
      <ChevronDown className="ml-1 w-4 h-4 inline-block text-foreground shrink-0" />
    );
  };

  const Th = ({ field, children, className = "" }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th 
      onClick={() => onSort(field)} 
      className={`p-4 font-semibold text-(--header) cursor-pointer hover:bg-muted/50 select-none truncate ${className}`}
      title={children as string}
    >
      <div className="flex items-center truncate">
        <span className="truncate">{children}</span>
        {renderSortIcon(field)}
      </div>
    </th>
  );

  if (type === "illegal") {
    return (
      <thead className="bg-muted/30 border-b border-(--wrapper)">
        <tr>
          <Th field="name" className="w-[20%]">ชื่อ - นามสกุล</Th>
          <Th field="nationality" className="w-[15%]">สัญชาติ</Th>
          <Th field="detected_date" className="w-[15%]">วันที่ตรวจพบ</Th>
          <Th field="detected_location" className="w-[25%]">สถานที่ตรวจพบ</Th>
          <Th field="is_victim" className="w-[15%]">สถานะผู้เสียหาย</Th>
          <th className="p-4 font-semibold text-(--header) w-[10%] truncate">จัดการ</th>
        </tr>
      </thead>
    );
  }

  return (
    <thead className="bg-muted/30 border-b border-(--wrapper)">
      <tr>
        <Th field="name" className="w-[20%]">ชื่อ - นามสกุล</Th>
        <Th field="date_of_birth" className="w-[15%]">วันเกิด / อายุ</Th>
        <Th field="national_id" className="w-[15%]">เลขประจำตัว</Th>
        <Th field="address" className="w-[20%]">สถานที่ตรวจพบ</Th>
        <Th field="return_date" className="w-[10%]">วันที่ส่งกลับ</Th>
        <Th field="result" className="w-[10%]">สถานะ</Th>
        <th className="p-4 font-semibold text-(--header) w-[10%] truncate">จัดการ</th>
      </tr>
    </thead>
  );
}