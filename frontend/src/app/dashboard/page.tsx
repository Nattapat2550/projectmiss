"use client";

import { Suspense } from "react";
import Link from "next/link";
import BarChart from "@/components/dashboard/BarChart";
import { useDashboard } from "@/hooks/useDashboard";

function DashboardContent() {
  const { states, actions, derived } = useDashboard();
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
              <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <span className="font-bold text-lg block mb-6 text-(--header)">กราฟสรุปจำนวนคนหาย</span>
                {(!states.dashboardData || states.dashboardData.tableData.length === 0) ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground font-medium text-sm">ไม่มีข้อมูลแสดงผลตามตัวกรองที่ระบุ</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-2 justify-start items-start w-full">
                    {derived.natChart.length > 0 && <BarChart data={derived.natChart} title="สัญชาติ (Top 6)" />}
                    {derived.genderChart.length > 0 && <BarChart data={derived.genderChart} title="เพศ" />}
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="bg-transparent mb-10">
                 <div className="flex justify-between items-center mb-6">
                   <span className="font-bold text-lg text-(--header)">ตารางข้อมูลคนหาย ({derived.totalItems.toLocaleString("th-TH")} รายการ)</span>
                 </div>
                 
                 <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] overflow-x-auto">
                   <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-(--wrapper) text-(--header)">
                        <tr>
                          <th className="px-4 py-3 cursor-pointer" onClick={() => actions.handleSort("name")}>ชื่อ-สกุล ↕</th>
                          <th className="px-4 py-3 cursor-pointer" onClick={() => actions.handleSort("nationality")}>สัญชาติ ↕</th>
                          <th className="px-4 py-3">เพศ</th>
                          <th className="px-4 py-3">อายุ</th>
                          <th className="px-4 py-3 cursor-pointer" onClick={() => actions.handleSort("reported_date")}>วันที่รับแจ้ง ↕</th>
                          <th className="px-4 py-3">สถานะ (วันที่พบตัว)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {derived.tableRows.map((row: any, index: number) => (
                          <tr key={`${row.missing_person_id}-${index}`} className="border-b border-(--wrapper) hover:bg-black/5 dark:hover:bg-white/5">
                            <td className="px-4 py-3 font-medium">{row.first_name_th || "ไม่ระบุ"}</td>
                            <td className="px-4 py-3">{row.nationality || "ไม่ระบุ"}</td>
                            <td className="px-4 py-3">{row.gender || "ไม่ระบุ"}</td>
                            <td className="px-4 py-3">{row.age || "ไม่ระบุ"}</td>
                            <td className="px-4 py-3">{row.detected_date ? new Date(row.detected_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}</td>
                            <td className="px-4 py-3">{row.return_date ? `พบตัวแล้ว (${new Date(row.return_date).toLocaleDateString("th-TH")})` : "ยังไม่พบตัว"}</td>
                          </tr>
                        ))}
                        {derived.tableRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ไม่พบข้อมูล</td>
                          </tr>
                        )}
                      </tbody>
                   </table>
                 </div>

                 {/* Pagination */}
                 {derived.totalPages > 1 && (
                    <div className="flex justify-between items-center bg-(--container) p-4 border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] mt-6">
                      <span className="text-sm font-medium">หน้า {states.currentPage} จาก {derived.totalPages}</span>
                      <div className="flex items-center gap-2">
                        <button disabled={states.currentPage === 1} onClick={() => actions.setCurrentPage(Math.max(states.currentPage - 1, 1))} className="px-3 py-1 border rounded disabled:opacity-50">
                          ก่อนหน้า
                        </button>
                        <button disabled={states.currentPage === derived.totalPages} onClick={() => actions.setCurrentPage(Math.min(states.currentPage + 1, derived.totalPages))} className="px-3 py-1 border rounded disabled:opacity-50">
                          ถัดไป
                        </button>
                      </div>
                    </div>
                 )}
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
