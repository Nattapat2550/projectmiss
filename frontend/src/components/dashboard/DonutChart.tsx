import React from "react";
import { ChartItem } from "@/hooks/useDashboard";

export default function DonutChart({ data, title }: { data: ChartItem[]; title: string; }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const SIZE = 240; const cx = SIZE / 2; const cy = SIZE / 2; const R = 100; const r = 60;
  let cumulative = 0;
  
  const slices = data.map((d) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.value;
    let endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    if (endAngle - startAngle === 2 * Math.PI) endAngle -= 0.0001; 
    return { ...d, startAngle, endAngle };
  });

  function polarToCart(angle: number, radius: number) { return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }; }
  function arcPath(startAngle: number, endAngle: number) {
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const s = polarToCart(startAngle, R); const e = polarToCart(endAngle, R);
    const si = polarToCart(startAngle, r); const ei = polarToCart(endAngle, r);
    return [`M ${s.x} ${s.y}`, `A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`, `L ${ei.x} ${ei.y}`, `A ${r} ${r} 0 ${large} 0 ${si.x} ${si.y}`, "Z"].join(" ");
  }

  return (
    <div className="flex flex-col items-center justify-start gap-3 w-full xl:flex-1 xl:min-w-50 overflow-hidden">
      <p className="text-sm font-semibold shrink-0 text-(--header)">{title}</p>
      <div className="w-full flex items-center justify-center shrink-0 h-55">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: "100%", height: "100%" }}>
          {slices.map((s, i) => (
            <path key={i} d={arcPath(s.startAngle, s.endAngle)} style={{ fill: s.color }} />
          ))}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor" className="text-(--header)">{total.toLocaleString("th-TH")}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill="currentColor" className="opacity-60 text-foreground">ทั้งหมด</text>
        </svg>
      </div>
      <div className="flex flex-col gap-1 w-full max-w-65 shrink-0 mt-1">
        {data.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="rounded-sm shrink-0 w-2.5 h-2.5" style={{ backgroundColor: d.color }} />
              <span className="truncate flex-1 text-foreground">{d.name}</span>
              <span className="font-mono font-semibold shrink-0 text-(--header)">{d.value} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}