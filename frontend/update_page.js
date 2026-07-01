const fs = require('fs');
let code = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// 1. Add new filters to UI
const newFilters = `
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-bold text-(--header) opacity-70">จังหวัด</label>
            <select value={states.filterProvince} onChange={(e) => actions.handleFilterChange(actions.setFilterProvince, e.target.value)} className={inputClass}>
              {derived.provinceOptions.map((n: string) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-(--header) opacity-70">ช่วงอายุ</label>
            <select value={states.filterAge} onChange={(e) => actions.handleFilterChange(actions.setFilterAge, e.target.value)} className={inputClass}>
              {derived.ageOptions.map((n: string) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-(--header) opacity-70">ข้อบ่งชี้การค้ามนุษย์</label>
            <select value={states.filterTrafficking} onChange={(e) => actions.handleFilterChange(actions.setFilterTrafficking, e.target.value)} className={inputClass}>
              {derived.traffickingOptions.map((n: string) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-(--header) opacity-70">สถานะ</label>
            <select value={states.filterStatus} onChange={(e) => actions.handleFilterChange(actions.setFilterStatus, e.target.value)} className={inputClass}>
              {derived.statusOptions.map((n: string) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
`;
code = code.replace(
  /<div className=\"flex flex-col gap-2 mt-2\">\s*<label className=\"text-sm font-bold text-\(--header\) opacity-70\">รับแจ้งตั้งแต่วันที่/g,
  newFilters + '\n          <div className="flex flex-col gap-2 mt-2">\n             <label className="text-sm font-bold text-(--header) opacity-70">รับแจ้งตั้งแต่วันที่'
);

// 2. Add DonutChart import if not present
if (!code.includes('import DonutChart')) {
  // It's probably in page.tsx (Home). I will create a simple DonutChart in this file or use BarChart.
  // Wait, I can just use BarChart for everything or create a simple DonutChart component locally.
  const donutComponent = `
function DonutChart({ data, title }: { data: {name: string, value: number, color: string}[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const SIZE = 240; 
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 100; 
  const r = 60;  

  let cumulative = 0;
  const slices = data.map((d) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.value;
    let endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    if (endAngle - startAngle === 2 * Math.PI) endAngle -= 0.0001;
    return { ...d, startAngle, endAngle };
  });

  function polarToCart(angle: number, radius: number) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function arcPath(startAngle: number, endAngle: number): string {
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const s = polarToCart(startAngle, R);
    const e = polarToCart(endAngle, R);
    const si = polarToCart(startAngle, r);
    const ei = polarToCart(endAngle, r);
    return [
      \`M \${s.x} \${s.y}\`,
      \`A \${R} \${R} 0 \${large} 1 \${e.x} \${e.y}\`,
      \`L \${ei.x} \${ei.y}\`,
      \`A \${r} \${r} 0 \${large} 0 \${si.x} \${si.y}\`,
      "Z",
    ].join(" ");
  }

  return (
    <div className="flex flex-col items-center justify-start gap-3 w-full h-full p-4 bg-(--container) rounded-lg border border-(--wrapper)">
      <p className="text-sm font-semibold shrink-0" style={{ color: "var(--header)" }}>{title}</p>
      <div className="w-full flex items-center justify-center shrink-0 h-48">
        <svg viewBox={\`0 0 \${SIZE} \${SIZE}\`} style={{ width: "100%", height: "100%", maxHeight: "200px" }}>
          {slices.map((s, i) => (
            <path key={i} d={arcPath(s.startAngle, s.endAngle)} style={{ fill: s.color || "gray" }} />
          ))}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor" style={{ color: "var(--header)" }}>
            {total.toLocaleString("th-TH")}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill="currentColor" className="opacity-60" style={{ color: "var(--foreground)" }}>
            ทั้งหมด
          </text>
        </svg>
      </div>
      <div className="flex flex-col gap-1 w-full max-w-65 shrink-0 mt-1 pb-2">
        {data.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="rounded-sm shrink-0 w-2.5 h-2.5" style={{ backgroundColor: d.color || "gray" }} />
              <span className="truncate flex-1" style={{ color: "var(--foreground)" }}>{d.name}</span>
              <span className="font-mono font-semibold shrink-0" style={{ color: "var(--header)" }}>
                {d.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
`;
  code = code.replace(/function DashboardContent\(\) \{/, donutComponent + '\nfunction DashboardContent() {');
}

// 3. Add charts to rendering logic
const newCharts = `
                    {(!visibleCharts.length || visibleCharts.includes("province")) && derived.provinceChart && derived.provinceChart.length > 0 && <BarChart data={derived.provinceChart} title="จังหวัดที่สูญหาย (Top 6)" />}
                    {(!visibleCharts.length || visibleCharts.includes("reportedDate")) && derived.reportedDateChart && derived.reportedDateChart.length > 0 && <BarChart data={derived.reportedDateChart} title="แนวโน้มวันที่รับแจ้งความ (รายเดือน)" />}
                    {(!visibleCharts.length || visibleCharts.includes("ageGroup")) && derived.ageChart && derived.ageChart.length > 0 && <BarChart data={derived.ageChart} title="ช่วงอายุคนหาย" />}
                    {(!visibleCharts.length || visibleCharts.includes("trafficking")) && derived.traffickingChart && derived.traffickingChart.length > 0 && <DonutChart data={derived.traffickingChart} title="ข้อบ่งชี้การค้ามนุษย์" />}
                    {(!visibleCharts.length || visibleCharts.includes("status")) && derived.statusChart && derived.statusChart.length > 0 && <DonutChart data={derived.statusChart} title="สถานะการพบตัว" />}
`;
code = code.replace(
  /\{\(!visibleCharts\.length \|\| visibleCharts\.includes\(\"gender\"\)\) && derived\.genderChart\.length > 0 && <BarChart data=\{derived\.genderChart\} title=\"เพศ\" \/>\}/g,
  '{(!visibleCharts.length || visibleCharts.includes("gender")) && derived.genderChart.length > 0 && <BarChart data={derived.genderChart} title="เพศ" />}\n' + newCharts
);

// 4. Update the settings checkboxes
const newCheckboxes = `
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("province")} onChange={() => toggleChart("province")} className="w-4 h-4 accent-(--blueText)" />
                    จังหวัดที่สูญหาย
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("reportedDate")} onChange={() => toggleChart("reportedDate")} className="w-4 h-4 accent-(--blueText)" />
                    แนวโน้มวันที่รับแจ้งความ
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("ageGroup")} onChange={() => toggleChart("ageGroup")} className="w-4 h-4 accent-(--blueText)" />
                    ช่วงอายุ
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("trafficking")} onChange={() => toggleChart("trafficking")} className="w-4 h-4 accent-(--blueText)" />
                    ข้อบ่งชี้การค้ามนุษย์
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("status")} onChange={() => toggleChart("status")} className="w-4 h-4 accent-(--blueText)" />
                    สถานะการพบตัว
                  </label>
`;
code = code.replace(
  /<label className=\"flex items-center gap-3 text-sm font-semibold text-\(--header\) cursor-pointer select-none\">\s*<input\s*type=\"checkbox\"\s*checked=\{visibleCharts\.includes\(\"gender\"\)\}\s*onChange=\{\(\) => toggleChart\(\"gender\"\)\}\s*className=\"w-4 h-4 accent-\(--blueText\)\"\s*\/>\s*เพศ\s*<\/label>/g,
  '<label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">\n                    <input \n                      type="checkbox" \n                      checked={visibleCharts.includes("gender")} \n                      onChange={() => toggleChart("gender")} \n                      className="w-4 h-4 accent-(--blueText)" \n                    />\n                    เพศ\n                  </label>\n' + newCheckboxes
);

// Update select all button
code = code.replace(
  /setVisibleCharts\(\[\"nationality\", \"gender\"\]\)/g,
  'setVisibleCharts(["nationality", "gender", "province", "reportedDate", "ageGroup", "trafficking", "status"])'
);

fs.writeFileSync('src/app/dashboard/page.tsx', code);
console.log('page.tsx updated successfully.');
