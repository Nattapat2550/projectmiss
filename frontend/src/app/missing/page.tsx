"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import MissingTable, { SortField } from "@/components/missing/MissingTable";
import MissingCard from "@/components/missing/MissingCard";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { toJpeg } from "html-to-image";
import jsPDF from "jspdf";

const missingTranslationMap: { [key: string]: string } = {
  missing_person_id: "รหัสบุคคลสูญหาย (ID)",
  first_name_th: "ชื่อจริง (ภาษาไทย)",
  middle_name_th: "ชื่อกลาง (ภาษาไทย)",
  last_name_th: "นามสกุล (ภาษาไทย)",
  first_name_en: "ชื่อจริง (ภาษาอังกฤษ)",
  middle_name_en: "ชื่อกลาง (ภาษาอังกฤษ)",
  last_name_en: "นามสกุล (ภาษาอังกฤษ)",
  date_of_birth: "วันเกิด",
  gender: "เพศ",
  nationality: "สัญชาติ",
  passport_number: "เลขที่หนังสือเดินทาง",
  missing_id_card_passport: "เลขประจำตัวประชาชน/พาสปอร์ต",
  case_id: "รหัสกรณีสูญหาย (Case ID)",
  missing_date: "วันที่สูญหาย",
  missing_time: "เวลาที่สูญหาย",
  detected_location_details: "รายละเอียดสถานที่สูญหาย",
  detected_location_sub_district: "ตำบลที่สูญหาย",
  detected_location_district: "อำเภอที่สูญหาย",
  detected_location_province: "จังหวัดที่สูญหาย",
  photo_url: "ลิงก์รูปถ่าย",
  found_date: "วันที่พบตัว",
  reported_date: "วันที่รับแจ้งความ",
  case_number: "เลขคดีความ",
  operation_result: "ผลการดำเนินการ/สถานะพบตัว",
  station: "สถานีตำรวจที่รับแจ้ง",
  incident_summary: "สรุปพฤติการณ์เหตุการณ์",
  human_trafficking_indicators: "ข้อบ่งชี้การค้ามนุษย์",
  notes: "หมายเหตุเพิ่มเติม",
  pjv_number: "เลข ปจว. ที่รับแจ้ง",
  pjv_file_url: "ลิงก์ไฟล์/ภาพถ่าย ปจว.",
  victim_classification: "ผลการคัดแยกเหยื่อ",
  human_trafficking_type: "ประเภทของการค้ามนุษย์",
  officer_name: "ชื่อเจ้าหน้าที่ตำรวจ/พนักงานสอบสวน",
  entry_channel: "ช่องทางการเข้าเมือง",
  entry_checkpoint_province: "ด่านและจังหวัดที่เข้าเมือง",
  airline: "สายการบิน",
  entry_date: "วันที่เดินทางเข้าเมือง",
  action_taken: "การดำเนินการที่ผ่านมา",
  relationship: "ความสัมพันธ์กับผู้แจ้งความ",
  receiving_channel: "ช่องทางการรับแจ้งเหตุ",
  command_center: "กองบัญชาการที่รับแจ้ง (บช.)",
  division_type: "ประเภทกองบังคับการ",
  division_name: "ชื่อกองบังคับการ",
  informant_first_name_th: "ชื่อจริงผู้แจ้ง (ภาษาไทย)",
  informant_middle_name_th: "ชื่อกลางผู้แจ้ง (ภาษาไทย)",
  informant_last_name_th: "นามสกุลผู้แจ้ง (ภาษาไทย)",
  informant_first_name_en: "ชื่อจริงผู้แจ้ง (ภาษาอังกฤษ)",
  informant_middle_name_en: "ชื่อกลางผู้แจ้ง (ภาษาอังกฤษ)",
  informant_last_name_en: "นามสกุลผู้แจ้ง (ภาษาอังกฤษ)",
  informant_date_of_birth: "วันเกิดผู้แจ้ง",
  informant_gender: "เพศผู้แจ้ง",
  informant_nationality: "สัญชาติผู้แจ้ง",
  informant_id_card_passport: "เลขประจำตัวประชาชน/พาสปอร์ตผู้แจ้ง",
  informant_contact_channel: "ช่องทางการติดต่อผู้แจ้ง",
  informant_phone: "เบอร์โทรศัพท์ผู้แจ้ง",
  informant_email: "อีเมลผู้แจ้ง",
  age: "อายุ",
};

const formatValue = (key: string, val: any) => {
  if (val === null || val === undefined) return "-";
  if (key.includes("date") && typeof val === "string" && !isNaN(Date.parse(val))) {
    return new Date(val).toLocaleDateString("th-TH");
  }
  if (val === true || val === "true") return "ใช่";
  if (val === false || val === "false") return "ไม่ใช่";
  return val;
};

function MissingPageContent() {
  const router = useRouter();
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const selectedIds = selectedRows.map(r => r.id);

  useEffect(() => {
    const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    setIsLoggedIn(!!token && token !== "null");
  }, []);

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

        if (debouncedSearch) {
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
      Swal.fire({ title: "กำลังสร้าง Excel", text: "กรุณารอสักครู่...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      setTimeout(() => {
        try {
          const selectedData = selectedRows.map((person: any) => {
            const row: any = {};
        const formattedKeys = ["first_name_th", "middle_name_th", "last_name_th", "first_name_en", "middle_name_en", "last_name_en", "date_of_birth", "gender", "human_trafficking_indicators", "operation_result", "id"];

        const fullNameTh = `${person.first_name_th || ""} ${person.middle_name_th || ""} ${person.last_name_th || ""}`.replace(/\s+/g, ' ').trim();
        const fullNameEn = `${person.first_name_en || ""} ${person.middle_name_en || ""} ${person.last_name_en || ""}`.replace(/\s+/g, ' ').trim();
        const finalName = (fullNameTh && fullNameTh !== "ไม่ระบุ") ? fullNameTh : (fullNameEn && fullNameEn !== "ไม่ระบุ") ? fullNameEn : "ไม่ระบุชื่อ";

        row["ชื่อ - นามสกุล"] = finalName;
        row["วันเกิด"] = person.date_of_birth ? new Date(person.date_of_birth).toLocaleDateString("th-TH") : "-";
        row["เพศ"] = person.gender === "MALE" ? "ชาย" : person.gender === "FEMALE" ? "หญิง" : person.gender === "UNKNOWN" ? "ไม่ระบุ" : person.gender || "-";
        row["ข้อบ่งชี้ค้ามนุษย์"] = person.human_trafficking_indicators === true || person.human_trafficking_indicators === "YES" || person.human_trafficking_indicators === "true" ? "เข้าข่ายค้ามนุษย์" : person.human_trafficking_indicators === false || person.human_trafficking_indicators === "NO" || person.human_trafficking_indicators === "false" ? "ไม่เข้าข่าย" : "รอคัดแยก";
        row["สถานะพบตัว"] = (person.return_date || person.found_date || person.result === true || person.result === "true" || person.operation_result === true || person.operation_result === "true") ? "พบตัวแล้ว" : "ยังไม่พบตัว";

        Object.keys(person).forEach(key => {
          if (!formattedKeys.includes(key)) {
            const thaiKey = missingTranslationMap[key] || key;
            row[thaiKey] = formatValue(key, person[key]);
          }
        });
        return row;
          });
          const ws = XLSX.utils.json_to_sheet(selectedData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Missing Persons");
          XLSX.writeFile(wb, "missing_persons.xlsx");
        } catch (err) {
          console.error("Excel Export error:", err);
          Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถสร้างไฟล์ Excel ได้", "error");
        } finally {
          handleCancelExport();
          Swal.close();
        }
      }, 50);
    } else if (result.isDenied) {
      // PDF
      setIsExporting(true);
      Swal.fire({ 
        title: "กำลังสร้าง PDF", 
        html: `กรุณารอสักครู่...<br><br><div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden mt-2"><div id="swal-progress" class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div></div><div id="swal-progress-text" class="mt-2 text-sm font-medium">0% (0/${selectedRows.length})</div>`, 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
      });
      try {
        let pdf: any = null;
        for (let i = 0; i < selectedRows.length; i++) {
          const id = selectedRows[i].id;
          const element = document.getElementById(`pdf-card-${id}`);
          if (element) {
            // Use html-to-image to perfectly preserve Thai typography (vowels/tones) and CSS layout
            const imgData = await toJpeg(element, { quality: 0.85, pixelRatio: 2, cacheBust: true });
            
            const width = element.offsetWidth * 2;
            const height = element.offsetHeight * 2;
            
            if (!pdf) {
              pdf = new jsPDF("l", "px", [width, height]);
            } else {
              pdf.addPage([width, height], "l");
            }
            pdf.addImage(imgData, "JPEG", 0, 0, width, height, undefined, "FAST");
            
            // Update progress bar
            const percent = Math.round(((i + 1) / selectedRows.length) * 100);
            const progressBar = document.getElementById('swal-progress');
            const progressText = document.getElementById('swal-progress-text');
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) progressText.innerText = `${percent}% (${i + 1}/${selectedRows.length})`;
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
                  <button 
                    onClick={() => {
                      if (!isLoggedIn) {
                        router.push('/login');
                        return;
                      }
                      setIsExportMode(true);
                    }} 
                    className="px-4 py-2 bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 font-bold rounded-sm hover:opacity-90 transition text-sm cursor-pointer"
                  >
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
              placeholder="ค้นหาชื่อ, เลขคดี, เลข ปจว, สน./สภ., บช., บก. ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-base text-foreground placeholder:text-zinc-400 placeholder:text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="hover:opacity-70 transition ml-2 text-zinc-400 cursor-pointer">
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
            <div key={person.id} id={`pdf-card-${person.id}`} style={{ width: "856px", minHeight: "540px", height: "max-content", backgroundColor: "white" }}>
              <MissingCard data={person} isExporting={true} />
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