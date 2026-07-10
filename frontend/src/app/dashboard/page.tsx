"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import BarChart from "@/components/dashboard/BarChart";
import LineChart from "@/components/dashboard/LineChart";
import { useDashboard } from "@/hooks/useDashboard";
import MissingTable from "@/components/missing/MissingTable";



function DashboardContent() {
  const { states, actions, derived } = useDashboard();
  const [showSettings, setShowSettings] = useState(false);
  const [visibleCharts, setVisibleCharts] = useState<string[]>([]);

  useEffect(() => {
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };
    
    const cookieVal = getCookie("dashboard_visible_charts_miss");
    if (cookieVal) {
      setVisibleCharts(cookieVal.split(",").filter(Boolean));
    } else {
      setVisibleCharts(["nationality", "gender", "region", "province", "commandCenter", "divisionName", "reportedDate", "ageGroup", "trafficking", "status"]);
    }
  }, []);

  const saveVisibleCharts = (chartsList: string[]) => {
    setVisibleCharts(chartsList);
    const date = new Date();
    date.setTime(date.getTime() + (365 * 24 * 60 * 60 * 1000));
    document.cookie = `dashboard_visible_charts_miss=${chartsList.join(",")}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
  };

  const toggleChart = (chart: string) => {
    const isVisible = visibleCharts.includes(chart);
    const updated = isVisible ? visibleCharts.filter((c) => c !== chart) : [...visibleCharts, chart];
    saveVisibleCharts(updated);
  };
  const inputClass = "w-full bg-background border border-(--wrapper) text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--header)/40 [&::-webkit-calendar-picker-indicator]:dark:invert";

  return (
    <div className="w-full p-4 sm:p-6 transition-colors duration-200" style={{ backgroundColor: "var(--wrapper)", minHeight: "calc(100vh - 80px)" }}>
      <Link href="/" className="inline-flex items-center gap-1 font-bold mb-6 hover:opacity-70 transition text-(--header) text-2xl">
        {"< หน้าหลัก"}
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* แผงควบคุม Filters */}
        <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] p-6 shrink-0 flex flex-col gap-5 w-full lg:w-72">
          <span className="font-bold text-lg text-(--header)">ฟิลเตอร์ตัวเลือก</span>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-(--header) opacity-70">สัญชาติ</label>
            <select value={states.filterNat} onChange={(e) => actions.handleFilterChange(actions.setFilterNat, e.target.value)} className={inputClass}>
              {derived.nationalitiesOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-(--header) opacity-70">เพศ</label>
            <select value={states.filterGender} onChange={(e) => actions.handleFilterChange(actions.setFilterGender, e.target.value)} className={inputClass}>
              {derived.gendersOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-bold text-(--header) opacity-70">ภาค</label>
            <select value={states.filterRegion} onChange={(e) => actions.handleFilterChange(actions.setFilterRegion, e.target.value)} className={inputClass}>
              {derived.regionsOptions.map((n: string) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
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

          <div className="flex flex-col gap-2 mt-2">
            <label className="text-sm font-bold text-(--header) opacity-70">กองบัญชาการ (บช.)</label>
            <select value={states.filterCommandCenter} onChange={(e) => { actions.handleFilterChange(actions.setFilterCommandCenter, e.target.value); actions.setFilterDivisionName("ทั้งหมด"); }} className={inputClass}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              {derived.commandCenterOptions.map((opt: any) => {
                const val = typeof opt === "string" ? opt : opt.value;
                return <option key={val} value={val}>{typeof opt === "string" ? opt : opt.label}</option>;
              })}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-(--header) opacity-70">กองบังคับการ (บก.)</label>
            <select value={states.filterDivisionName} onChange={(e) => actions.handleFilterChange(actions.setFilterDivisionName, e.target.value)} className={inputClass}>
              <option value="ทั้งหมด">ทั้งหมด</option>
              {derived.divisionOptions.map((opt: any) => {
                const val = typeof opt === "string" ? opt : opt.value;
                return <option key={val} value={val}>{typeof opt === "string" ? opt : opt.label}</option>;
              })}
            </select>
          </div>

          <div className="flex flex-col gap-2 mt-2">
             <label className="text-sm font-bold text-(--header) opacity-70">รับแจ้งตั้งแต่วันที่</label>
             <input type="date" value={states.startDate} onChange={(e) => actions.handleFilterChange(actions.setStartDate, e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-2">
             <label className="text-sm font-bold text-(--header) opacity-70">ถึงวันที่</label>
             <input type="date" value={states.endDate} onChange={(e) => actions.handleFilterChange(actions.setEndDate, e.target.value)} className={inputClass} />
          </div>

          <button onClick={actions.resetFilters} className="mt-2 w-full py-2 bg-(--wrapper) text-foreground font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition text-sm cursor-pointer shadow-sm">
            รีเซ็ตทั้งหมด
          </button>
        </div>

        {/* โซนแสดงผล */}
        <div className="flex flex-col gap-6 flex-1 min-w-0 w-full relative">
          {states.loading && !states.dashboardData ? (
             <div className="flex flex-col items-center justify-center h-64 bg-(--container) border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
               <div className="animate-spin rounded-full h-10 w-10 border-4 border-(--wrapper) border-t-(--header) mb-4"></div>
               <span className="text-muted-foreground text-sm font-medium">กำลังโหลดข้อมูลแดชบอร์ด...</span>
            </div>
          ) : (
            <div className={`flex flex-col gap-6 w-full transition-opacity duration-300 ${states.isUpdating ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              {/* Stats */}
              <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <span className="font-bold text-lg flex mb-4 text-(--header) justify-between">
                  <span>สถิติเบื้องต้น</span>
                  {states.isUpdating && <span className="text-xs animate-pulse opacity-70 ml-4">กำลังอัปเดต...</span>}
                </span>
                <div className="flex gap-10 flex-wrap">
                  {derived.stats.map((s) => (
                    <div key={s.label} className="flex flex-col">
                      <span className="text-sm font-bold text-(--header) opacity-70 mb-1">{s.label}</span>
                      <span className="text-4xl font-black text-(--header)">{Number(s.value).toLocaleString("th-TH")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts */}
              <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.25)] relative">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-lg text-(--header)">กราฟสรุปจำนวนคนหาย</span>
                  <button 
                    onClick={() => setShowSettings(true)} 
                    className="px-3 py-1.5 bg-(--wrapper) border border-zinc-300 dark:border-zinc-700 rounded text-xs font-bold text-(--header) hover:opacity-80 transition cursor-pointer flex items-center gap-1 active:scale-95 select-none"
                  >
                    ⚙️ ตั้งค่าความน่าสนใจของกราฟ
                  </button>
                </div>
                {(!states.dashboardData || states.dashboardData.tableData.length === 0) ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground font-medium text-sm">ไม่มีข้อมูลแสดงผลตามตัวกรองที่ระบุ</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-2 justify-start items-start w-full">
                    {(!visibleCharts.length || visibleCharts.includes("nationality")) && derived.natChart.length > 0 && <BarChart data={derived.natChart} title="สัญชาติ (Top 6)" />}
                    {(!visibleCharts.length || visibleCharts.includes("gender")) && derived.genderChart.length > 0 && <BarChart data={derived.genderChart} title="เพศ" />}

                    {(!visibleCharts.length || visibleCharts.includes("region")) && derived.regionChart && derived.regionChart.length > 0 && <BarChart data={derived.regionChart} title="ภาคที่สูญหาย" />}
                    {(!visibleCharts.length || visibleCharts.includes("province")) && derived.provinceChart && derived.provinceChart.length > 0 && <BarChart data={derived.provinceChart} title="จังหวัดที่สูญหาย (Top 6)" />}
                    {(!visibleCharts.length || visibleCharts.includes("commandCenter")) && derived.commandCenterChart && derived.commandCenterChart.length > 0 && <BarChart data={derived.commandCenterChart} title="กองบัญชาการ (Top 6)" />}
                    {(!visibleCharts.length || visibleCharts.includes("divisionName")) && derived.divisionNameChart && derived.divisionNameChart.length > 0 && <BarChart data={derived.divisionNameChart} title="กองบังคับการ (Top 6)" />}
                    {(!visibleCharts.length || visibleCharts.includes("reportedDate")) && derived.reportedDateChart && derived.reportedDateChart.length > 0 && <LineChart data={derived.reportedDateChart} title="แนวโน้มวันที่รับแจ้งความ (รายเดือน)" />}
                    {(!visibleCharts.length || visibleCharts.includes("ageGroup")) && derived.ageChart && derived.ageChart.length > 0 && <BarChart data={derived.ageChart} title="ช่วงอายุคนหาย" />}
                    {(!visibleCharts.length || visibleCharts.includes("trafficking")) && derived.traffickingChart && derived.traffickingChart.length > 0 && <BarChart data={derived.traffickingChart} title="ข้อบ่งชี้การค้ามนุษย์" />}
                    {(!visibleCharts.length || visibleCharts.includes("status")) && derived.statusChart && derived.statusChart.length > 0 && <BarChart data={derived.statusChart} title="สถานะการพบตัว" />}

                  </div>
                )}
              </div>

              {/* Table */}
              <div className="bg-transparent mb-10">
                 <div className="flex justify-between items-center mb-6">
                   <span className="font-bold text-lg text-(--header)">ตารางข้อมูลคนหาย ({derived.totalItems.toLocaleString("th-TH")} รายการ)</span>
                 </div>
                 
                 <MissingTable 
                   data={derived.tableRows} 
                   sortField={states.sortField as any} 
                   sortDirection={states.sortDirection} 
                   onSort={actions.handleSort as any} 
                 />

                 {/* Pagination */}
                 {derived.totalPages > 0 && (() => {
                    let startPage = Math.max(1, states.currentPage - 5);
                    let endPage = Math.min(derived.totalPages, states.currentPage + 5);

                    if (endPage - startPage < 10) {
                      if (startPage === 1) {
                        endPage = Math.min(derived.totalPages, startPage + 10);
                      } else if (endPage === derived.totalPages) {
                        startPage = Math.max(1, endPage - 10);
                      }
                    }

                    const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

                    return (
                      <div className="flex flex-col md:flex-row justify-between items-center p-4 border rounded-sm mt-6 shadow-[0_1px_2px_var(--shadow)] bg-(--container) border-(--wrapper) gap-4">
                        <span className="text-sm font-medium opacity-70">
                          หน้า {states.currentPage} จาก {derived.totalPages}
                        </span>

                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            disabled={states.currentPage === 1}
                            onClick={() => actions.setCurrentPage(1)}
                            className="px-3 py-2 border rounded-sm disabled:opacity-30 text-sm font-medium transition cursor-pointer bg-(--button) border-(--wrapper) hover:bg-(--row-hover) text-foreground"
                            title="หน้าแรกสุด"
                          >
                            &laquo;
                          </button>
                          <button
                            disabled={states.currentPage === 1}
                            onClick={() => actions.setCurrentPage(Math.max(states.currentPage - 1, 1))}
                            className="px-3 py-2 border rounded-sm disabled:opacity-30 text-sm font-medium transition cursor-pointer bg-(--button) border-(--wrapper) hover:bg-(--row-hover) text-foreground"
                            title="ก่อนหน้า"
                          >
                            &lsaquo;
                          </button>

                          <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
                            {pageNumbers.map((page) => (
                              <button
                                key={page}
                                onClick={() => actions.setCurrentPage(page)}
                                className={`px-3 py-2 border rounded-sm text-sm font-medium transition cursor-pointer ${
                                  page === states.currentPage
                                    ? "bg-(--header) text-background font-bold pointer-events-none border-transparent"
                                    : "bg-(--button) border-(--wrapper) text-foreground hover:bg-(--row-hover)"
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            disabled={states.currentPage === derived.totalPages}
                            onClick={() => actions.setCurrentPage(Math.min(states.currentPage + 1, derived.totalPages))}
                            className="px-3 py-2 border rounded-sm disabled:opacity-30 text-sm font-medium transition cursor-pointer bg-(--button) border-(--wrapper) hover:bg-(--row-hover) text-foreground"
                            title="ถัดไป"
                          >
                            &rsaquo;
                          </button>
                          <button
                            disabled={states.currentPage === derived.totalPages}
                            onClick={() => actions.setCurrentPage(derived.totalPages)}
                            className="px-3 py-2 border rounded-sm disabled:opacity-30 text-sm font-medium transition cursor-pointer bg-(--button) border-(--wrapper) hover:bg-(--row-hover) text-foreground"
                            title="หน้าท้ายสุด"
                          >
                            &raquo;
                          </button>
                        </div>
                      </div>
                    );
                 })()}
              </div>
              
            </div>
          )}

          {/* Popup Modal สำหรับ Checkboxes ตั้งค่า */}
          {showSettings && (
            <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] p-6 w-full max-w-md shadow-2xl relative">
                <h4 className="text-lg font-bold text-(--header) mb-4">⚙️ ตั้งค่าความน่าสนใจของกราฟ</h4>
                <p className="text-sm opacity-80 text-(--header) mb-4">
                  เลือกกราฟที่ต้องการให้แสดงผลบนแดชบอร์ดหลัก:
                </p>
                
                <div className="flex flex-col gap-3 mb-6">
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={visibleCharts.includes("nationality")} 
                      onChange={() => toggleChart("nationality")} 
                      className="w-4 h-4 accent-(--blueText)" 
                    />
                    สัญชาติ (Top 6)
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={visibleCharts.includes("gender")} 
                      onChange={() => toggleChart("gender")} 
                      className="w-4 h-4 accent-(--blueText)" 
                    />
                    เพศ
                  </label>

                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("region")} onChange={() => toggleChart("region")} className="w-4 h-4 accent-(--blueText)" />
                    ภาคที่สูญหาย
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("province")} onChange={() => toggleChart("province")} className="w-4 h-4 accent-(--blueText)" />
                    จังหวัดที่สูญหาย
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("commandCenter")} onChange={() => toggleChart("commandCenter")} className="w-4 h-4 accent-(--blueText)" />
                    กองบัญชาการ (Top 6)
                  </label>
                  <label className="flex items-center gap-3 text-sm font-semibold text-(--header) cursor-pointer select-none">
                    <input type="checkbox" checked={visibleCharts.includes("divisionName")} onChange={() => toggleChart("divisionName")} className="w-4 h-4 accent-(--blueText)" />
                    กองบังคับการ (Top 6)
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
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    onClick={() => saveVisibleCharts(["nationality", "gender", "region", "province", "commandCenter", "divisionName", "reportedDate", "ageGroup", "trafficking", "status"])} 
                    className="px-3.5 py-1.5 bg-zinc-200 dark:bg-zinc-800 text-sm font-bold text-(--header) hover:opacity-80 transition rounded cursor-pointer select-none"
                  >
                    แสดงผลทั้งหมด
                  </button>
                  <button 
                    onClick={() => setShowSettings(false)} 
                    className="px-5 py-1.5 bg-(--blueText) text-(--button) text-sm font-bold hover:opacity-90 transition rounded cursor-pointer select-none"
                  >
                    ตกลง
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">กำลังโหลดระบบแดชบอร์ด...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
