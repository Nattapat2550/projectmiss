import Link from "next/link";
import Image from "next/image";

export const dynamic = "force-dynamic";
// ─── คอนสแตนท์สีสำหรับกราฟ (อัปเดตให้ใช้ตัวแปร CSS เพื่อรองรับ Theme) ──────────
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

interface ChartItem {
  name: string;
  value: number;
  color: string;
}

// ─── คอมโพเนนต์กราฟวงกลม Donut Chart (SVG) ───────────────────────────────────
function DonutChart({ data, title }: { data: ChartItem[]; title: string }) {
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
    if (endAngle - startAngle === 2 * Math.PI) {
      endAngle -= 0.0001;
    }
    return { ...d, startAngle, endAngle };
  });

  function polarToCart(angle: number, radius: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  function arcPath(startAngle: number, endAngle: number): string {
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    const s = polarToCart(startAngle, R);
    const e = polarToCart(endAngle, R);
    const si = polarToCart(startAngle, r);
    const ei = polarToCart(endAngle, r);
    return [
      `M ${s.x} ${s.y}`,
      `A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`,
      `L ${ei.x} ${ei.y}`,
      `A ${r} ${r} 0 ${large} 0 ${si.x} ${si.y}`,
      "Z",
    ].join(" ");
  }

  return (
    // ✨ เอา min-h-0 และ overflow-hidden ออก เพื่อให้กราฟและรายการยืดได้เต็มที่
    <div className="flex flex-col items-center justify-start gap-3 w-full h-full">
      <p className="text-sm font-semibold shrink-0" style={{ color: "var(--header)" }}>{title}</p>

      <div className="w-full flex items-center justify-center shrink-0 h-55">
        <svg 
          viewBox={`0 0 ${SIZE} ${SIZE}`} 
          style={{ width: "100%", height: "100%" }}
        >
          {slices.map((s, i) => (
            // ✨ อัปเดตการลงสีด้วย style={{ fill: ... }} เพื่อให้รองรับ CSS Variables
            <path key={i} d={arcPath(s.startAngle, s.endAngle)} style={{ fill: s.color }} />
          ))}
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="24" fontWeight="bold" fill="currentColor" style={{ color: "var(--header)" }}>
            {total.toLocaleString("th-TH")}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize="12" fill="currentColor" className="opacity-60" style={{ color: "var(--foreground)" }}>
            ทั้งหมด
          </text>
        </svg>
      </div>

      <div className="flex flex-col gap-1 w-full max-w-65 shrink-0 mt-1 pb-4">
        {data.map((d, i) => {
          const pct = ((d.value / total) * 100).toFixed(1);
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="rounded-sm shrink-0 w-2.5 h-2.5" style={{ backgroundColor: d.color }} />
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

// ─── ดึงข้อมูลแบบ Server-Side ────────────────────────────────────────────────
async function fetchDashboardStats(type: string) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/api/v1/dashboard?type=${type}&limit=1`, { 
      next: { revalidate: 10 } 
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

// ─── หน้าเพจหลัก (Server Component) ──────────────────────────────────────
export default async function Home() {
  const missingJson = await fetchDashboardStats("missing");

  const missingCount = missingJson?.stats?.total ?? null;

  const countDisplay = (n: number | null) =>
    n === null ? "XX" : n.toLocaleString("th-TH");

  const missingChart = (() => {
    const raw = missingJson?.charts?.gender || [];
    const sum = raw.reduce((acc: number, curr: any) => acc + curr.value, 0);
    const total = missingJson?.stats?.total || 0;
    
    const mapped = raw.map((d: any, i: number) => ({
      ...d, color: CHART_COLORS[i % CHART_COLORS.length]
    }));

    if (total > sum) {
      mapped.push({ name: "อื่นๆ", value: total - sum, color: "var(--chart-other)" });
    }
    return mapped;
  })();

  return (
    <div
      className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 w-full overflow-y-auto overflow-x-hidden justify-center"
      style={{
        backgroundColor: "var(--wrapper)",
        boxSizing: "border-box",
        minHeight: "calc(100vh - 80px)", 
      }}
    >
      <div style={{ maxWidth: "600px", width: "100%" }}>
        <HomeCard
          title="บุคคลสูญหาย"
          count={countDisplay(missingCount)}
          viewAllHref="/missing-upload"
          dashboardHref="/dashboard"
          addHref="/missing-upload"
          chartData={missingChart}
          chartTitle="สัดส่วนเพศ"
          imageSrc="/enter.png"
        />
      </div>
    </div>
  );
}

interface HomeCardProps {
  title: string;
  count: string;
  viewAllHref: string;
  dashboardHref: string;
  addHref: string;
  chartData: ChartItem[];
  chartTitle: string;
  imageSrc: string;
}

function HomeCard({
  title,
  count,
  viewAllHref,
  dashboardHref,
  addHref,
  chartData,
  chartTitle,
  imageSrc
}: HomeCardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--wrapper)",
        display: "flex",
        flexDirection: "column",
        borderRadius: "0.2rem",
        boxShadow: "4px 4px 0px rgba(0, 0, 0, 0.25)",
        color: "var(--header)",
        flex: 1, 
        // ✨ ลบ height: 100%, minHeight: 0 และ overflow: hidden ทิ้ง เพื่อให้การ์ดขยายตามความยาวกราฟได้
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--container)",
          fontSize: "1rem",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          boxSizing: "border-box",
          // ✨ ลบ overflow: hidden ตรงนี้ด้วย
        }}
      >
        <div
          className="flex items-center gap-4 px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--shadow)" }}
        >
          <div
            className="rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
            style={{
              width: 80,
              height: 64,
              backgroundColor: "var(--wrapper)",
              border: "1px solid var(--shadow)",
            }}
          >
              <img src={imageSrc} className="ratio-[1/1] dark:invert"></img>
            
            </div>
          
          <div className="flex flex-col shrink-0">
            <span
              className="font-bold leading-tight"
              style={{ color: "var(--header)", fontSize: "1.35rem" }}
            >
              {title}
            </span>
            <span
              className="font-bold"
              style={{ color: "var(--header)", fontSize: "1.15rem" }}
            >
              จำนวน <span>{count}</span> คน
            </span>
          </div>
        </div>

        <div className="px-5 pt-3 shrink-0">
          <Link href={viewAllHref} className="block w-full">
            <button
              className="w-full py-2 rounded-lg font-medium text-center transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: "var(--button)",
                border: "1px solid var(--shadow)",
                color: "var(--foreground)",
              }}
            >
              ดูข้อมูลทั้งหมด
            </button>
          </Link>
        </div>

        <div className="px-5 pt-2 shrink-0">
          <Link href={dashboardHref} className="block w-full">
            <button
              className="w-full py-2 rounded-lg font-medium text-center transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: "var(--button)",
                border: "1px solid var(--shadow)",
                color: "var(--foreground)",
              }}
            >
              แดชบอร์ด
            </button>
          </Link>
        </div>

        <div
          className="mx-5 mt-3 shrink-0"
          style={{ borderBottom: "1px solid var(--shadow)" }}
        />

        {/* ✨ เอา overflow-hidden ออกตรงนี้ด้วย */}
        <div className="flex flex-1 items-start justify-center px-5 py-3 pt-5">
          {chartData && chartData.length > 0 ? (
            <DonutChart data={chartData} title={chartTitle} />
          ) : (
            <div
              className="rounded-full flex items-center justify-center font-medium shrink-0"
              style={{
                width: 160,
                height: 160,
                border: "20px solid var(--wrapper)",
                backgroundColor: "var(--container)",
                color: "var(--foreground)",
              }}
            >
              ไม่มีข้อมูล
            </div>
          )}
        </div>

        <div
          className="mx-5 shrink-0"
          style={{ borderBottom: "1px solid var(--shadow)" }}
        />

        <div className="px-5 py-4 shrink-0 pb-5">
          <Link href={addHref} className="block w-full">
            <button
              className="w-full py-2 rounded-lg font-medium text-center transition-opacity hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: "var(--button)",
                border: "1px solid var(--shadow)",
                color: "var(--foreground)",
              }}
            >
              เพิ่มข้อมูล
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}