"use client";

import { Suspense } from "react";
import Link from "next/link";
import IllegalTable, { SortField as IllegalSortField } from "@/components/immigrants/IllegalTable";
import RepatriatedTable, { SortField as RepatriatedSortField } from "@/components/immigrants/RepatriatedTable";
// เปลี่ยนจาก DonutChart เป็น BarChart (ต้องสร้างไฟล์ BarChart ไว้ในตำแหน่งเดียวกัน)
import BarChart from "@/components/dashboard/BarChart";
import { useDashboard } from "@/hooks/useDashboard";

function DashboardContent() {
  const { states, actions, derived } = useDashboard();
  const inputClass = "w-full bg-background border border- (--wrapper)] text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring- (--header)]/40 [&::-webkit-calendar-picker-indicator]:dark:invert";

  return (
    <div className="w-full p-4 sm:p-6 transition-colors duration-200" style={{ backgroundColor: "var(--wrapper)", minHeight: "calc(100vh - 80px)" }}>
      <Link href="/" className="inline-flex items-center gap-1 font-bold mb-6 hover:opacity-70 transition text-(--header) text-2xl">
        {"< แดชบอร์ด"}
      </Link>

      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* แผงควบคุม Filters */}
        <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] p-6 shrink-0 flex flex-col gap-5 w-full lg:w-72">
          <span className="font-bold text-lg text-(--header)">ฟิลเตอร์ตัวเลือก</span>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text- (--header)] opacity-70">ประเภทข้อมูล</label>
            <select value={states.filterType} onChange={(e) => actions.handleTypeChange(e.target.value as "illegal" | "repatriated")} className={inputClass}>
              <option value="illegal">ผู้ลักลอบเข้า (Illegal)</option>
              <option value="repatriated">ผู้ถูกส่งกลับ (Repatriated)</option>
            </select>
          </div>

          {states.filterType === "illegal" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text- (--header)] opacity-70">สัญชาติ</label>
              <select value={states.filterNat} onChange={(e) => actions.handleFilterChange(actions.setFilterNat, e.target.value)} className={inputClass}>
                {derived.nationalitiesOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text- (--header)] opacity-70">เพศ</label>
            <select value={states.filterGender} onChange={(e) => actions.handleFilterChange(actions.setFilterGender, e.target.value)} className={inputClass}>
              {derived.gendersOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-stone-600 dark:text-slate-300">ผู้เพิ่มข้อมูล</label>
            <select value={states.filterCreator} onChange={(e) => actions.handleFilterChange(actions.setFilterCreator, e.target.value)} className={inputClass}>
              {derived.creatorsOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {states.filterType === "illegal" && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text- (--header)] opacity-70">สถานะผู้เสียหาย</label>
                <select value={states.filterVictim} onChange={(e) => actions.handleFilterChange(actions.setFilterVictim, e.target.value)} className={inputClass}>
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  <option value="true">เป็นผู้เสียหาย</option>
                  <option value="false">ไม่เป็นผู้เสียหาย</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text- (--header)] opacity-70">สถานะหนังสือเดินทาง</label>
                <select value={states.filterPassport} onChange={(e) => actions.handleFilterChange(actions.setFilterPassport, e.target.value)} className={inputClass}>
                  <option value="ทั้งหมด">ทั้งหมด</option>
                  <option value="true">มีหนังสือเดินทาง</option>
                  <option value="false">ไม่มี / ไม่มีข้อมูล</option>
                </select>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2 mt-2">
             <label className="text-sm font-bold text- (--header)] opacity-70">{states.filterType === "repatriated" ? "วันที่ส่งกลับ (ตั้งแต่)" : "ตั้งแต่วันที่"}</label>
             <input type="date" value={states.startDate} onChange={(e) => actions.handleFilterChange(actions.setStartDate, e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-2">
             <label className="text-sm font-bold text- (--header)] opacity-70">{states.filterType === "repatriated" ? "วันที่ส่งกลับ (ถึง)" : "ถึงวันที่"}</label>
             <input type="date" value={states.endDate} onChange={(e) => actions.handleFilterChange(actions.setEndDate, e.target.value)} className={inputClass} />
          </div>

          {states.filterType === "repatriated" && (
            <>
              <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-(--wrapper)">
                <label className="text-sm font-bold text- (--header)] opacity-70">วันเกิดตั้งแต่</label>
                <input type="date" value={states.dobStart} onChange={(e) => actions.handleFilterChange(actions.setDobStart, e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text- (--header)] opacity-70">ถึงวันที่ (วันเกิด)</label>
                <input type="date" value={states.dobEnd} onChange={(e) => actions.handleFilterChange(actions.setDobEnd, e.target.value)} className={inputClass} />
              </div>
            </>
          )}
          <button onClick={actions.resetFilters} className="mt-2 w-full py-2 bg-(--wrapper) text-foreground font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition text-sm cursor-pointer shadow-sm">
            รีเซ็ตทั้งหมด
          </button>
        </div>

        {/* โซนแสดงผล */}
        <div className="flex flex-col gap-6 flex-1 min-w-0 w-full relative">
          {states.loading && !states.dashboardData ? (
             <div className="flex flex-col items-center justify-center h-64 bg-(--container) border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
               <div className="animate-spin rounded-full h-10 w-10 border-4 border-(--wrapper) border-t-(--header) mb-4"></div>
               <span className="text-muted-foreground text-sm font-medium">กำลังโหลดข้อมูลแดชบอร์ดล่าสุด...</span>
            </div>
          ) : (
            <div className={`flex flex-col gap-6 w-full transition-opacity duration-300 ${states.isUpdating ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              {/* Stats */}
              <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <span className="font-bold text-lg block mb-4 text-(--header) justify-between">
                  <span>สถิติเบื้องต้น</span>
                  {states.isUpdating && <span className="text-xs animate-pulse opacity-70 ml-4">กำลังอัปเดต...</span>}
                </span>
                <div className="flex gap-10 flex-wrap">
                  {derived.stats.map((s) => (
                    <div key={s.label} className="flex flex-col">
                      <span className="text-sm font-bold text- (--header)] opacity-70 mb-1">{s.label}</span>
                      <span className="text-4xl font-black text-(--header)">{Number(s.value).toLocaleString("th-TH")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charts - เปลี่ยนไปใช้ BarChart หมด */}
              <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                <span className="font-bold text-lg block mb-6 text-(--header)">กราฟสรุปจำนวนคนทั้งหมด</span>
                {(!states.dashboardData || states.dashboardData.tableData.length === 0) ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground font-medium text-sm">ไม่มีข้อมูลแสดงผลตามสัญชาติหรือวันที่ระบุ</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-2 justify-start items-start w-full">
                    {states.filterType === "illegal" ? (
                      <>
                        {derived.natChart.length > 0 && <BarChart data={derived.natChart} title="สัญชาติ (Top 6)" />}
                        {derived.genderChart.length > 0 && <BarChart data={derived.genderChart} title="เพศ" />}
                        {derived.victimChart.length > 0 && <BarChart data={derived.victimChart} title="สถานะผู้เสียหาย" />}
                        {derived.passportChart.length > 0 && <BarChart data={derived.passportChart} title="สถานะหนังสือเดินทาง" />}
                        {derived.creatorChart.length > 0 && <BarChart data={derived.creatorChart} title="ผู้เพิ่มข้อมูล" />}
                      </>
                    ) : (
                      <>
                        {derived.genderChart.length > 0 && <BarChart data={derived.genderChart} title="เพศ" />}
                        {derived.channelChart.length > 0 && <BarChart data={derived.channelChart} title="ช่องทางการส่งกลับ" />}
                        {derived.creatorChart.length > 0 && <BarChart data={derived.creatorChart} title="ผู้เพิ่มข้อมูล" />}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Table & Pagination */}
              <div className="bg-transparent mb-10">
                 <div className="flex justify-between items-center mb-6">
                   <span className="font-bold text-lg text-(--header)">ตารางข้อมูล ({derived.totalItems.toLocaleString("th-TH")} รายการ)</span>
                 </div>
                 <div className="bg-(--container) border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
                   {states.filterType === "illegal" ? (
                     <IllegalTable data={derived.tableRows} sortField={states.sortField as IllegalSortField} sortDirection={states.sortDirection} onSort={actions.handleSort} />
                   ) : (
                     <RepatriatedTable data={derived.tableRows} sortField={states.sortField as RepatriatedSortField} sortDirection={states.sortDirection} onSort={actions.handleSort} />
                   )}
                 </div>
                 {/* แถบควบคุมเปลี่ยนหน้าเพจ (Pagination) ฉบับเต็ม */}
                 {derived.totalPages > 1 && (() => {
                    const totalPages = derived.totalPages;
                    
                    let startPage = Math.max(1, states.currentPage - 5);
                    let endPage = Math.min(totalPages, states.currentPage + 5);

                    if (endPage - startPage < 10) {
                      if (startPage === 1) {
                        endPage = Math.min(totalPages, startPage + 10);
                      } else if (endPage === totalPages) {
                        startPage = Math.max(1, endPage - 10);
                      }
                    }

                    const pageNumbers = [];
                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(i);
                    }

                    return (
                      <div className="flex flex-col md:flex-row justify-between items-center bg-(--container) p-4 border border-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] mt-6 gap-4">
                        
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          หน้า {states.currentPage} จาก {totalPages}
                        </span>

                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            disabled={states.currentPage === 1}
                            onClick={() => actions.setCurrentPage(1)}
                            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm disabled:opacity-50 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                            title="หน้าแรกสุด"
                          >
                            &laquo;
                          </button>

                          <button
                            disabled={states.currentPage === 1}
                            onClick={() => actions.setCurrentPage(Math.max(states.currentPage - 1, 1))}
                            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm disabled:opacity-50 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                            title="ก่อนหน้า"
                          >
                            &lsaquo;
                          </button>

                          <div className="hidden sm:flex items-center gap-1">
                            {pageNumbers.map((page) => (
                              <button
                                key={page}
                                onClick={() => actions.setCurrentPage(page)}
                                className={`px-3 py-2 border rounded-sm text-sm font-medium transition cursor-pointer ${
                                  page === states.currentPage
                                    ? "bg-zinc-800 text-white border-zinc-800 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-200 pointer-events-none"
                                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            disabled={states.currentPage === totalPages}
                            onClick={() => actions.setCurrentPage(Math.min(states.currentPage + 1, totalPages))}
                            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm disabled:opacity-50 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                            title="ถัดไป"
                          >
                            &rsaquo;
                          </button>

                          <button
                            disabled={states.currentPage === totalPages}
                            onClick={() => actions.setCurrentPage(totalPages)}
                            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm disabled:opacity-50 text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
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