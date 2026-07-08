import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAgenciesOptions } from "@/hooks/useAgenciesOptions";

export interface StatItem { label: string; value: number | string; }
export interface ChartItem { name: string; value: number; color: string; }
export interface DashboardData {
  stats: { total: number; found?: number; };
  charts: { 
    nationality?: { name: string; value: number; color?: string }[]; 
    gender?: { name: string; value: number; color?: string }[]; 
    province?: { name: string; value: number; color?: string }[];
    ageGroup?: { name: string; value: number; color?: string }[];
    humanTrafficking?: { name: string; value: number; color?: string }[];
    status?: { name: string; value: number; color?: string }[];
    commandCenter?: { name: string; value: number; color?: string }[];
    divisionName?: { name: string; value: number; color?: string }[];
    reportedDateTrend?: { name: string; value: number; color?: string }[];
  };
  meta: { totalItems: number; totalPages: number; currentPage: number; allNationalities: string[]; allGenders: string[]; allProvinces: string[]; };
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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true); 
  const [isUpdating, setIsUpdating] = useState(false); 

  const [filterNat, setFilterNat] = useState<string>("ทั้งหมด");
  const [filterGender, setFilterGender] = useState<string>("ทั้งหมด");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterProvince, setFilterProvince] = useState<string>("ทั้งหมด");
  const [filterAge, setFilterAge] = useState<string>("ทั้งหมด");
  const [filterTrafficking, setFilterTrafficking] = useState<string>("ทั้งหมด");
  const [filterStatus, setFilterStatus] = useState<string>("ทั้งหมด");
  const [filterCommandCenter, setFilterCommandCenter] = useState<string>("ทั้งหมด");
  const [filterDivisionName, setFilterDivisionName] = useState<string>("ทั้งหมด");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { commandCenterOptions, divisionOptions } = useAgenciesOptions(
    filterCommandCenter === "ทั้งหมด" ? "" : filterCommandCenter, 
    filterDivisionName === "ทั้งหมด" ? "" : filterDivisionName, 
    ""
  );

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const params = new URLSearchParams({
      nationality: filterNat,
      gender: filterGender,
      startDate, endDate,
      province: filterProvince,
      ageGroup: filterAge,
      human_trafficking: filterTrafficking,
      status: filterStatus,
      command_center: filterCommandCenter,
      division_name: filterDivisionName,
      page: currentPage.toString(),
      limit: "50"
    });

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
  }, [filterNat, filterGender, startDate, endDate, filterProvince, filterAge, filterTrafficking, filterStatus, filterCommandCenter, filterDivisionName, currentPage, sortField, sortDirection]);

  const handleFilterChange = (setter: Function, value: any) => { setter(value); setCurrentPage(1); };
  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
    setCurrentPage(1); 
  };
  const resetFilters = () => {
    setFilterNat("ทั้งหมด"); setFilterGender("ทั้งหมด"); 
    setStartDate(""); setEndDate(""); setFilterProvince("ทั้งหมด"); setFilterAge("ทั้งหมด"); setFilterTrafficking("ทั้งหมด"); setFilterStatus("ทั้งหมด"); setFilterCommandCenter("ทั้งหมด"); setFilterDivisionName("ทั้งหมด"); setSortField(""); setCurrentPage(1);
  };

  const nationalitiesOptions = dashboardData?.meta?.allNationalities || ["ทั้งหมด"];
  const gendersOptions = Array.from(new Set(["ทั้งหมด", "ชาย", "หญิง", "ไม่ระบุ", ...(dashboardData?.meta?.allGenders || [])]));
  const provinceOptions = Array.from(new Set(["ทั้งหมด", "ไม่ระบุ", ...(dashboardData?.meta?.allProvinces || [])]));
  const ageOptions = ["ทั้งหมด", "0-18 ปี", "19-30 ปี", "31-50 ปี", "51 ปีขึ้นไป", "ไม่ระบุ"];
  const traffickingOptions = ["ทั้งหมด", "มีข้อบ่งชี้", "ไม่มีข้อบ่งชี้"];
  const statusOptions = ["ทั้งหมด", "พบตัวแล้ว", "ยังไม่พบตัว"];

  const tableRows = dashboardData?.tableData || [];

  const stats: StatItem[] = (() => {
    if (!dashboardData) return [];
    return [ 
      { label: "จำนวนรับแจ้งคนหายรวม", value: dashboardData.stats.total }, 
      { label: "พบตัวแล้ว", value: dashboardData.stats.found || 0 }
    ];
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

  const natChart = formatStandardChartData(dashboardData?.charts?.nationality, dashboardData?.stats?.total, 0);
  const genderChart = formatStandardChartData(dashboardData?.charts?.gender, dashboardData?.stats?.total, 2);
  const provinceChart = formatStandardChartData(dashboardData?.charts?.province, dashboardData?.stats?.total, 3);
  const ageChart = formatStandardChartData(dashboardData?.charts?.ageGroup, dashboardData?.stats?.total, 4);
  const traffickingChart = formatStandardChartData(dashboardData?.charts?.humanTrafficking, dashboardData?.stats?.total, 5);
  const statusChart = formatStandardChartData(dashboardData?.charts?.status, dashboardData?.stats?.total, 1);
  const reportedDateChart = dashboardData?.charts?.reportedDateTrend?.map((d: any) => ({ ...d, color: "var(--blueText)" })) || [];

  const commandCenterChart = formatStandardChartData(dashboardData?.charts?.commandCenter, dashboardData?.stats?.total, 0);
  const divisionNameChart = formatStandardChartData(dashboardData?.charts?.divisionName, dashboardData?.stats?.total, 1);

  return {
    states: { filterNat, filterGender, filterProvince, filterAge, filterTrafficking, filterStatus, filterCommandCenter, filterDivisionName, startDate, endDate, currentPage, sortField, sortDirection, loading, isUpdating, dashboardData },
    actions: { handleFilterChange, handleSort, resetFilters, setCurrentPage, setFilterNat, setFilterGender, setStartDate, setEndDate, setFilterProvince, setFilterAge, setFilterTrafficking, setFilterStatus, setFilterCommandCenter, setFilterDivisionName },
    derived: { nationalitiesOptions, gendersOptions, provinceOptions, ageOptions, traffickingOptions, statusOptions, commandCenterOptions, divisionOptions, provinceChart, ageChart, traffickingChart, statusChart, reportedDateChart, tableRows, stats, natChart, genderChart, commandCenterChart, divisionNameChart, totalPages: dashboardData?.meta?.totalPages || 1, totalItems: dashboardData?.meta?.totalItems || 0 }
  };
}
