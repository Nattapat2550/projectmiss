import React from "react";
import { ChartItem } from "@/hooks/useDashboard";

export default function LineChart({ data, title }: { data: ChartItem[]; title: string; }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const maxX = data.length - 1 || 1;

  const points = data.map((d, i) => {
    const x = (i / maxX) * 100; // 0 to 100%
    const y = 100 - (d.value / maxValue) * 100; // 0 to 100%
    return { x, y, value: d.value, name: d.name, color: d.color };
  });

  const pathPoints = points.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-start justify-start gap-4 w-full xl:flex-1 xl:min-w-50 bg-transparent">
      <p className="text-sm font-semibold shrink-0 text-(--header)">{title}</p>
      
      <div className="w-full relative h-48 flex mt-2 gap-3 pr-2">
        {/* Y-Axis */}
        <div className="flex flex-col justify-between items-end text-[10px] text-(--foreground) opacity-70 w-6 shrink-0 font-mono" style={{ height: "calc(100% - 2rem)" }}>
          <span className="-mt-1.5">{Math.round(maxValue).toLocaleString("th-TH")}</span>
          <span className="-mt-1.5">{Math.round(maxValue * 0.75).toLocaleString("th-TH")}</span>
          <span className="-mt-1.5">{Math.round(maxValue * 0.5).toLocaleString("th-TH")}</span>
          <span className="-mt-1.5">{Math.round(maxValue * 0.25).toLocaleString("th-TH")}</span>
          <span className="-mt-1.5">0</span>
        </div>

        {/* Graph Area and X-Axis */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 w-full relative">
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(y => (
              <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="var(--wrapper)" strokeWidth="0.5" strokeDasharray="2 2" />
            ))}
            {/* Line */}
            <polyline
              fill="none"
              stroke="var(--blueText)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              points={pathPoints}
            />
          </svg>
          {/* Data Points and Tooltips */}
          {points.map((p, i) => (
             <div 
               key={i} 
               className="absolute w-3 h-3 rounded-full border-2 border-(--container) bg-(--blueText) -ml-1.5 -mt-1.5 hover:scale-150 transition-transform cursor-pointer group"
               style={{ left: `${p.x}%`, top: `${p.y}%` }}
             >
               <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-(--header) text-(--container) text-[10px] whitespace-nowrap px-2 py-1 rounded pointer-events-none transition-opacity z-10">
                 {p.name}: {p.value.toLocaleString("th-TH")}
               </div>
             </div>
          ))}
        </div>
        {/* X-Axis Labels */}
        <div className="w-full h-6 relative mt-2 text-[10px] text-(--foreground) opacity-70">
          {points.map((p, i) => {
             // Show at most 6 labels to avoid overlap
             const step = Math.ceil(data.length / 6);
             if (i % step !== 0 && i !== data.length - 1) return null;
             // abbreviate month names if needed, but 'Mon YYYY' is short enough
             const label = p.name.split(" ")[0]; 
             return (
               <div 
                 key={i} 
                 className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-center"
                 style={{ left: `${p.x}%` }}
               >
                 {label}
               </div>
             );
          })}
        </div>
      </div>
      </div>

      <div className="mt-1 pt-2 border-t border-(--wrapper) w-full flex justify-between text-xs text-(--header) opacity-80">
        <span>รวมทั้งหมด</span>
        <span className="font-bold">{total.toLocaleString("th-TH")} รายการ</span>
      </div>
    </div>
  );
}
