import { useState, useMemo } from "react";
import { SortField } from "@/components/immigrants/TableHeader"; // ปรับ path ตามจริงของโปรเจกต์

export function useTableSort(data: any[]) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortField) return data;

    return [...data].sort((a: any, b: any) => {
      const dateFields = ["date_of_birth", "detected_date", "return_date"];
      if (dateFields.includes(sortField as string)) {
        const parseDateToTimestamp = (val: any) => {
          if (!val || val === "ไม่ระบุ") return 0;
          const dateStr = String(val).trim();
          
          if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              const [day, month, year] = parts;
              const parsedYear = parseInt(year) > 2500 ? parseInt(year) - 543 : parseInt(year);
              return new Date(`${parsedYear}-${month}-${day}`).getTime() || 0;
            }
          }
          const parsed = new Date(dateStr).getTime();
          return isNaN(parsed) ? 0 : parsed;
        };

        const aTime = parseDateToTimestamp(a[sortField]);
        const bTime = parseDateToTimestamp(b[sortField]);

        return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
      }

      let aValue = "";
      let bValue = "";

      if (sortField === "name") {
        aValue = `${a.first_name_th || ""} ${a.last_name_th || ""}`.trim();
        bValue = `${b.first_name_th || ""} ${b.last_name_th || ""}`.trim();
      } else {
        aValue = (a[sortField] || "").toString();
        bValue = (b[sortField] || "").toString();
      }

      const compareResult = aValue.localeCompare(bValue, "th", { sensitivity: "base" });
      return sortDirection === "asc" ? compareResult : -compareResult;
    });
  }, [data, sortField, sortDirection]);

  return { sortField, sortDirection, handleSort, sortedData };
}