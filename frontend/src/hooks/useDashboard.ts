import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export interface StatItem { label: string; value: number | string; }
export interface ChartItem { name: string; value: number; color: string; }
export interface DashboardData {
  stats: { total: number; victims?: number; hasPassport?: number; success?: number; };
  charts: { 
    nationality?: { name: string; value: number; color?: string }[]; 
    gender?: { name: string; value: number; color?: string }[]; 
    victim?: { name: string; value: number; color?: string }[]; 
    passport?: { name: string; value: number; color?: string }[]; 
    channel?: { name: string; value: number; color?: string }[]; 
    creator?: { name: string; value: number; color?: string; profile_color?: string; creator_color?: string; }[]; 
  };
  meta: { totalItems: number; totalPages: number; currentPage: number; allNationalities: string[]; allGenders: string[]; allCreators?: string[]; };
  tableData: any[];
}

const CHART_COLORS = [
  "var(--chart-1)", 
  "var(--chart-2)", 
  "var(--chart-3)", 
  "var(--chart-4)", 
  "var(--chart-5)", 
  "var(--chart-6)"
];
const dashboardFetchCache = new Map<string, DashboardData>();

export function useDashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const typeParam = (searchParams.get("type") as "illegal" | "repatriated") || "illegal";

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true); 
  const [isUpdating, setIsUpdating] = useState(false); 

  const [filterType, setFilterType] = useState<"illegal" | "repatriated">(typeParam);
  const [filterNat, setFilterNat] = useState<string>("ทั้งหมด");
  const [filterGender, setFilterGender] = useState<string>("ทั้งหมด");
  const [filterVictim, setFilterVictim] = useState<string>("ทั้งหมด");
  const [filterPassport, setFilterPassport] = useState<string>("ทั้งหมด");
  const [filterCreator, setFilterCreator] = useState<string>("ทั้งหมด");
  
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dobStart, setDobStart] = useState<string>("");
  const [dobEnd, setDobEnd] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const params = new URLSearchParams({
      type: filterType,
      nationality: filterType === "illegal" ? filterNat : "ทั้งหมด",
      gender: filterGender,
      startDate, endDate,
      isVictim: filterType === "illegal" ? filterVictim : "ทั้งหมด",
      hasPassport: filterType === "illegal" ? filterPassport : "ทั้งหมด",
      page: currentPage.toString(),
      limit: "50"
    });

    if (filterCreator && filterCreator !== "ทั้งหมด") {
      params.append("creator", filterCreator);
    }

    if (filterType === "repatriated") {
      if (dobStart) params.append("dobStart", dobStart);
      if (dobEnd) params.append("dobEnd", dobEnd);
    }
    if (sortField) {
      params.append("sortBy", sortField);
      params.append("sortOrder", sortDirection);
    }

    const url = `${backendUrl}/api/v1/dashboard?${params.toString()}`;

    if (dashboardFetchCache.has(url)) {
      setDashboardData(dashboardFetchCache.get(url)!);
      setLoading(false);
      setIsUpdating(false);
    } else {
      if (!dashboardData) setLoading(true);
      else setIsUpdating(true);
    }

    const controller = new AbortController();
    fetch(url, { cache: "no-store", signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("API error"); return res.json(); })
      .then((json) => {
        dashboardFetchCache.set(url, json);
        setDashboardData(json);
        setLoading(false); setIsUpdating(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Fetch Error:", err);
          setLoading(false); setIsUpdating(false);
        }
      });
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterNat, filterGender, filterVictim, filterPassport, filterCreator, startDate, endDate, dobStart, dobEnd, currentPage, sortField, sortDirection]);

  useEffect(() => {
    if (typeParam !== filterType) {
      setFilterType(typeParam); setCurrentPage(1); setSortField(""); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeParam]);

  const handleFilterChange = (setter: Function, value: any) => { setter(value); setCurrentPage(1); };
  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
    setCurrentPage(1); 
  };
  const resetFilters = () => {
    setFilterNat("ทั้งหมด"); setFilterGender("ทั้งหมด"); setFilterVictim("ทั้งหมด");
    setFilterPassport("ทั้งหมด"); setFilterCreator("ทั้งหมด");
    setStartDate(""); setEndDate(""); setDobStart("");
    setDobEnd(""); setSortField(""); setCurrentPage(1);
  };
  const handleTypeChange = (val: "illegal" | "repatriated") => {
    setFilterType(val); resetFilters();
    router.replace(`/dashboard?type=${val}`, { scroll: false }); 
  };

  const nationalitiesOptions = dashboardData?.meta?.allNationalities || ["ทั้งหมด"];
  // เพิ่มการรับประกันว่า "ไม่ระบุ" จะถูกรวมใน dropdown เสมอ
  const gendersOptions = Array.from(new Set(["ทั้งหมด", "ชาย", "หญิง", "ไม่ระบุ", ...(dashboardData?.meta?.allGenders || [])]));
  const creatorsOptions = dashboardData?.meta?.allCreators || ["ทั้งหมด"];

  const tableRows = (dashboardData?.tableData || []).map((item: any) => {
    const fnTh = !item.first_name_th || item.first_name_th.trim() === "" || item.first_name_th === "ไม่ระบุ" ? (item.first_name_en || "ไม่ระบุ") : item.first_name_th;
    const lnTh = !item.last_name_th || item.last_name_th.trim() === "" || item.last_name_th === "ไม่ระบุ" ? (item.last_name_en || "ไม่ระบุ") : item.last_name_th;
    return { ...item, first_name_th: fnTh, last_name_th: lnTh };
  });

  const stats: StatItem[] = (() => {
    if (!dashboardData) return [];
    return filterType === "illegal"
      ? [ { label: "จำนวนทั้งหมดที่พบตามตัวกรอง", value: dashboardData.stats.total }, { label: "เป็นผู้เสียหาย (ค้ามนุษย์)", value: dashboardData.stats.victims || 0 }, { label: "ผู้มีหนังสือเดินทาง", value: dashboardData.stats.hasPassport || 0 } ]
      : [ { label: "จำนวนทั้งหมดที่พบตามตัวกรอง", value: dashboardData.stats.total }, { label: "ส่งกลับสำเร็จ", value: dashboardData.stats.success || 0 } ];
  })();

  const formatStandardChartData = (raw: any[] = [], total: number = 0, colorOffset: number = 0) => {
    const sum = raw.reduce((acc, curr) => acc + curr.value, 0);
    const mapped = raw.map((d, i) => ({ 
      ...d, 
      color: CHART_COLORS[(i + colorOffset) % CHART_COLORS.length] 
    }));
    if (total > sum) mapped.push({ name: "อื่นๆ", value: total - sum, color: "var(--chart-other)" });
    return mapped;
  };

  const formatCreatorChartData = (raw: any[] = [], total: number = 0) => {
    const sum = raw.reduce((acc, curr) => acc + curr.value, 0);
    const mapped = raw.map((d, i) => ({ 
      ...d, 
      color: d.color || d.profile_color || d.creator_color || CHART_COLORS[(i + 4) % CHART_COLORS.length] 
    }));
    if (total > sum) mapped.push({ name: "อื่นๆ", value: total - sum, color: "var(--chart-other)" });
    return mapped;
  };

  const natChart = formatStandardChartData(dashboardData?.charts?.nationality, dashboardData?.stats?.total, 0);
  const channelChart = formatStandardChartData(dashboardData?.charts?.channel, dashboardData?.stats?.total, 0);
  
  // กราฟเพศใหม่
  const genderChart = formatStandardChartData(dashboardData?.charts?.gender, dashboardData?.stats?.total, 2);

  const victimChart = (dashboardData?.charts?.victim || []).map(d => ({ 
    ...d, 
    color: d.name === "เป็นผู้เสียหาย" ? "var(--chart-1)" : "var(--chart-3)" 
  }));
  const passportChart = (dashboardData?.charts?.passport || []).map(d => ({ 
    ...d, 
    color: d.name === "มีหนังสือเดินทาง" ? "var(--chart-2)" : "var(--chart-4)" 
  }));
  
  const creatorChart = formatCreatorChartData(dashboardData?.charts?.creator, dashboardData?.stats?.total);

  return {
    states: { filterType, filterNat, filterGender, filterVictim, filterPassport, filterCreator, startDate, endDate, dobStart, dobEnd, currentPage, sortField, sortDirection, loading, isUpdating, dashboardData },
    actions: { handleFilterChange, handleSort, resetFilters, handleTypeChange, setCurrentPage, setFilterNat, setFilterGender, setFilterVictim, setFilterPassport, setFilterCreator, setStartDate, setEndDate, setDobStart, setDobEnd },
    derived: { nationalitiesOptions, gendersOptions, creatorsOptions, tableRows, stats, natChart, genderChart, channelChart, victimChart, passportChart, creatorChart, totalPages: dashboardData?.meta?.totalPages || 1, totalItems: dashboardData?.meta?.totalItems || 0 }
  };
}