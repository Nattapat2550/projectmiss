"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MissingTable, { SortField } from "@/components/missing/MissingTable";
import MissingCard from "@/components/missing/MissingCard";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function MissingPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isExportMode, setIsExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  
  const selectedIds = selectedRows.map(r => r.id);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        if (!data) setLoading(true);
        else setIsUpdating(true);
        
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: "50"
        });

        if (sortField) {
          params.append("sortBy", sortField);
          params.append("sortOrder", sortDirection);
        }

        if (debouncedSearch.trim()) {
          params.append("search", debouncedSearch.trim());
        }

        const res = await fetch(`${backendUrl}/api/v1/missing?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
        
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
        setIsUpdating(false); 
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sortField, sortDirection, debouncedSearch]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); 
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setIsExportMode(false);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setIsExportMode(false);
    setSelectedRows([]);
  };

  const handleToggleSelect = (id: string) => {
    const isSelected = selectedRows.some(r => r.id === id);
    if (isSelected) {
      setSelectedRows(prev => prev.filter(r => r.id !== id));
    } else {
      const person = tableRows.find((r: any) => r.id === id);
      if (person) setSelectedRows(prev => [...prev, person]);
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      const newRows = [...selectedRows];
      tableRows.forEach((r: any) => {
        if (!newRows.some(nr => nr.id === r.id)) newRows.push(r);
      });
      setSelectedRows(newRows);
    } else {
      const currentViewIds = tableRows.map((r: any) => r.id);
      setSelectedRows(prev => prev.filter(r => !currentViewIds.includes(r.id)));
    }
  };

  const handleExportConfirm = async () => {
    if (selectedRows.length === 0) {
      Swal.fire({ title: "เกิดข้อผิดพลาด", text: "กรุณาเลือกข้อมูลอย่างน้อย 1 รายการ", icon: "warning" });
      return;
    }
    
    const result = await Swal.fire({
      title: "เลือกรูปแบบการ Export",
      text: `คุณได้เลือกข้อมูล ${selectedRows.length} รายการ`,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Excel",
      denyButtonText: "PDF",
      cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
      // Excel
      const selectedData = selectedRows.map((person: any) => {
        const fullNameTh = `${person.missing_first_name_th || ""} ${person.missing_last_name_th || ""}`.trim();
        const fullNameEn = `${person.missing_first_name_en || ""} ${person.missing_last_name_en || ""}`.trim();
        const finalName = (fullNameTh && fullNameTh !== "ไม่ระบุ" && fullNameTh !== "ไม่ระบุ ไม่ระบุ") ? fullNameTh : (fullNameEn && fullNameEn !== "ไม่ระบุ" && fullNameEn !== "ไม่ระบุ ไม่ระบุ") ? fullNameEn : "ไม่ระบุชื่อ";

        const row: any = {
          "ชื่อ - นามสกุล": finalName,
          "สัญชาติ": person.nationality || "ไม่ระบุ",
          "วันเกิด": person.date_of_birth ? new Date(person.date_of_birth).toLocaleDateString("th-TH") : "-",
          "เพศ": person.gender === "MALE" ? "ชาย" : person.gender === "FEMALE" ? "หญิง" : person.gender === "UNKNOWN" ? "ไม่ระบุ" : person.gender,
          "สถานที่สูญหายล่าสุด": [person.detected_location_province, person.address, person.detected_location_details].find(v => v) || "ไม่ระบุสถานที่",
          "วันที่รับแจ้ง": person.missing_date ? new Date(person.missing_date).toLocaleDateString("th-TH") : person.detected_date ? new Date(person.detected_date).toLocaleDateString("th-TH") : "-",
          "ข้อบ่งชี้ค้ามนุษย์": person.human_trafficking_indicators === true || person.human_trafficking_indicators === "YES" || person.human_trafficking_indicators === "true" ? "เข้าข่ายค้ามนุษย์" : person.human_trafficking_indicators === false || person.human_trafficking_indicators === "NO" || person.human_trafficking_indicators === "false" ? "ไม่เข้าข่าย" : "รอคัดแยก",
          "สถานะ": (person.return_date || person.found_date || person.result === true || person.result === "true" || person.operation_result === true || person.operation_result === "true") ? "พบตัวแล้ว" : "ยังไม่พบตัว"
        };
        // นำคอลัมน์อื่นๆ ทั้งหมดจาก DB มาต่อท้าย
        Object.keys(person).forEach(key => {
          if (!["missing_first_name_th", "missing_last_name_th", "missing_first_name_en", "missing_last_name_en", "nationality", "date_of_birth", "gender", "detected_location_province", "address", "detected_location_details", "missing_date", "detected_date", "human_trafficking_indicators", "return_date", "found_date", "result", "operation_result", "id"].includes(key)) {
            row[key] = person[key];
          }
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(selectedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Missing Persons");
      XLSX.writeFile(wb, "missing_persons.xlsx");
      handleCancelExport();
    } else if (result.isDenied) {
      // PDF
      setIsExporting(true);
      Swal.fire({ title: "กำลังสร้าง PDF", text: "กรุณารอสักครู่...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        let pdf: any = null;
        for (let i = 0; i < selectedRows.length; i++) {
          const id = selectedRows[i].id;
          const element = document.getElementById(`pdf-card-${id}`);
          if (element) {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL("image/png");
            
            if (!pdf) {
              pdf = new jsPDF("l", "px", [canvas.width, canvas.height]);
            } else {
              pdf.addPage([canvas.width, canvas.height], "l");
            }
            pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
          }
        }
        if (pdf) pdf.save("missing_persons.pdf");
      } catch (err) {
        console.error("PDF Export error:", err);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์ PDF ได้", "error");
      } finally {
        setIsExporting(false);
        handleCancelExport();
        Swal.close();
      }
    }
  };
  const tableRows = (data?.tableData || []).map((item: any) => ({
    ...item,
    id: item.missing_person_id || item.id
  }));
  const totalItems = data?.meta?.totalItems || 0;
  const totalPages = data?.meta?.totalPages || 1;

  return (
    <div className="w-full p-4 sm:p-6 text-foreground bg-(--wrapper) min-h-[calc(100vh-80px)]">
      <div className="w-full bg-(--wrapper) rounded-[0.2rem] shadow-[4px_4px_0px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="p-5 sm:p-6 bg-(--container) min-h-[calc(100vh-120px)]">
          
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-(--header)">ข้อมูลบุคคลสูญหาย (Missing Persons)</h1>
            <div className="flex gap-2">
              {isExportMode ? (
                <>
                  <button onClick={handleCancelExport} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-foreground font-bold rounded-sm hover:opacity-90 transition text-sm cursor-pointer">
                    ยกเลิก
                  </button>
                  <button onClick={handleExportConfirm} disabled={isExporting} className="px-4 py-2 bg-(--blueText) text-(--button) font-bold rounded-sm hover:opacity-90 transition text-sm cursor-pointer disabled:opacity-50">
                    {isExporting ? "กำลัง Export..." : `ยืนยัน (${selectedRows.length})`}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsExportMode(true)} className="px-4 py-2 bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold rounded-sm hover:opacity-90 transition text-sm cursor-pointer">
                    Export
                  </button>
                  <Link href="/missing/create" className="px-4 py-2 bg-(--header) text-background font-bold rounded-sm hover:opacity-90 transition text-sm">
                    + เพิ่มข้อมูล
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mb-6 flex items-center px-4 py-2 border rounded-sm shadow-[0_1px_2px_var(--shadow)] bg-(--container) border-(--wrapper) text-foreground focus-within:ring-2 focus-within:ring-(--header) transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เลขพาสปอร์ต, บัตรประชาชน... (ใช้ช่องว่างแยกคำค้นหา)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-base text-foreground placeholder:text-zinc-400 placeholder:text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="hover:opacity-70 transition ml-2 text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-sm border border-red-200">
              เกิดข้อผิดพลาด: {error}
            </div>
          )}

          {loading && !data ? (
            <div className="flex flex-col items-center justify-center h-64">
               <div className="animate-spin rounded-full h-10 w-10 border-4 border-(--wrapper) border-t-(--header) mb-4"></div>
               <span className="text-sm font-medium opacity-70">กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            <div className={`bg-transparent mb-10 transition-opacity duration-300 ${isUpdating ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              <div className="mb-4 text-sm font-medium opacity-70 flex justify-between items-center">
                <span>ตารางข้อมูล ({totalItems.toLocaleString("th-TH")} รายการ)</span>
                {isUpdating && <span className="text-(--header) animate-pulse text-xs">กำลังอัปเดต...</span>}
              </div>
              
              <MissingTable 
                data={tableRows} 
                sortField={sortField} 
                sortDirection={sortDirection} 
                onSort={handleSort} 
                isExportMode={isExportMode}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
              />

              {totalPages > 0 && (() => {
                  let startPage = Math.max(1, currentPage - 5);
                  let endPage = Math.min(totalPages, currentPage + 5);

                  if (endPage - startPage < 10) {
                    if (startPage === 1) {
                      endPage = Math.min(totalPages, startPage + 10);
                    } else if (endPage === totalPages) {
                      startPage = Math.max(1, endPage - 10);
                    }
                  }

                  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

                  return (
                    <div className="flex flex-col md:flex-row justify-between items-center p-4 border rounded-sm mt-6 shadow-[0_1px_2px_var(--shadow)] bg-(--container) border-(--wrapper) gap-4">
                      <span className="text-sm font-medium opacity-70">
                        หน้า {currentPage} จาก {totalPages}
                      </span>

                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(1)}
                          className="px-3 py-2 border rounded-sm disabled:opacity-30 text-sm font-medium transition cursor-pointer bg-(--button) border-(--wrapper) hover:bg-(--row-hover) text-foreground"
                          title="หน้าแรกสุด"
                        >
                          &laquo;
                        </button>
                        <button
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                          className="px-3 py-2 border rounded-sm disabled:opacity-30 text-sm font-medium transition cursor-pointer bg-(--button) border-(--wrapper) hover:bg-(--row-hover) text-foreground"
                          title="ก่อนหน้า"
                        >
                          &lsaquo;
                        </button>

                        <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
                          {pageNumbers.map((page) => (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-2 border rounded-sm text-sm font-medium transition cursor-pointer ${
                                page === currentPage
                                  ? "bg-(--header) text-background font-bold pointer-events-none border-transparent"
                                  : "bg-(--button) border-(--wrapper) text-foreground hover:bg-(--row-hover)"
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </div>

                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                          className="px-3 py-2 border rounded-sm disabled:opacity-30 text-sm font-medium transition cursor-pointer bg-(--button) border-(--wrapper) hover:bg-(--row-hover) text-foreground"
                          title="ถัดไป"
                        >
                          &rsaquo;
                        </button>
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => handlePageChange(totalPages)}
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
          )}

        </div>
      </div>
      
      {isExportMode && selectedRows.length > 0 && (
        <div style={{ position: "absolute", left: "-9999px", top: 0, fontFamily: "'Sarabun', sans-serif" }}>
          {selectedRows.map((person: any) => (
            <div key={person.id} id={`pdf-card-${person.id}`} style={{ width: "856px", height: "540px", backgroundColor: "white" }}>
              <MissingCard data={person} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MissingPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-muted-foreground flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-500 mr-3"></div>กำลังเริ่มระบบตารางข้อมูล...</div>}>
      <MissingPageContent />
    </Suspense>
  );
}