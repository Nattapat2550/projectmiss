import React from "react";
import { ChartItem } from "@/hooks/useDashboard";

export default function BarChart({ data, title }: { data: ChartItem[]; title: string; }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-col items-start justify-start gap-4 w-full xl:flex-1 xl:min-w-50 overflow-hidden bg-transparent">
      <p className="text-sm font-semibold shrink-0 text-(--header)">{title}</p>
      
      {/* ส่วนของกราฟแท่ง (Stacked Bar) รวมอยู่ในแท่งเดียว */}
      <div className="w-full flex h-5 rounded-full overflow-hidden shadow-sm bg-black/5 dark:bg-white/5">
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <div
              key={i}
              style={{ width: `${pct}%`, backgroundColor: d.color }}
              className="h-full transition-all duration-500 ease-out hover:opacity-80 cursor-pointer"
              title={`${d.name}: ${d.value.toLocaleString("th-TH")} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* คำอธิบายข้อมูล (Legend) */}
      <div className="flex flex-col gap-1.5 w-full mt-1">
        {data.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="rounded-sm shrink-0 w-3 h-3" style={{ backgroundColor: d.color }} />
              <span className="truncate flex-1 text-foreground font-medium">{d.name}</span>
              <span className="font-mono font-semibold shrink-0 text-(--header)">
                {d.value.toLocaleString("th-TH")} <span className="opacity-60 text-[10px]">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
      
      {/* สรุปยอดรวม */}
      <div className="mt-1 pt-2 border-t border-(--wrapper) w-full flex justify-between text-xs text-(--header) opacity-80">
        <span>รวมทั้งหมด</span>
        <span className="font-bold">{total.toLocaleString("th-TH")} รายการ</span>
      </div>
    </div>
  );
}