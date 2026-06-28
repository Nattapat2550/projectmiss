'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';

export default function MissingUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setProgress({ current: 0, total: 0 });
      setCurrentPage(1);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('กรุณาเลือกไฟล์ Excel ก่อนทำการตรวจสอบ');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress({ current: 0, total: 0 });

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem("token");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/missing-persons/upload?action=preview`, {
        method: 'POST',
        headers: {
           ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setCurrentPage(1);
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์');
      }
    } catch (err: any) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ Backend ได้: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const jobId = Date.now().toString();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/api/v1/missing-persons/upload-progress/${jobId}`);
        const data = await res.json();
        setProgress({ current: data.current, total: data.total });
        if (data.status === 'completed') clearInterval(interval);
      } catch (e) {}
    }, 1000);

    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`${backendUrl}/api/v1/missing-persons/upload?action=upload&jobId=${jobId}`, {
        method: 'POST',
        headers: {
           ...(token && token !== "null" ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ!',
          text: data.message,
          timer: 2000,
          showConfirmButton: false
        });
        setResult(null);
        setFile(null);
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err: any) {
      setError('ล้มเหลว: ' + err.message);
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const renderNull = (text = "null") => (
    <span className="text-(--header) opacity-40 italic font-normal text-xs">{text}</span>
  );

  const renderDriveImage = (url: string) => {
    if (!url || url.trim() === '') return null;
    
    let driveId = null;
    const driveMatch1 = url.match(/\/d\/(.*?)\//); 
    const driveMatch2 = url.match(/id=(.*?)(&|$)/); 
    
    if (driveMatch1 && driveMatch1[1]) driveId = driveMatch1[1];
    else if (driveMatch2 && driveMatch2[1]) driveId = driveMatch2[1];

    const imgUrl = driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w250-h300` : url;

    return (
        <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider block mb-1">รูปถ่าย</span>
            <img 
                src={imgUrl} 
                alt="พรีวิวรูป" 
                className="w-20 h-24 object-cover rounded-md border border-(--wrapper) shadow-sm bg-(--container)"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 block truncate w-16 text-center" title={url}>
                🔗 เปิดลิงก์
            </a>
        </div>
    );
  };

  const paginatedData = result?.preview_data?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil((result?.preview_data?.length || 0) / itemsPerPage);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-background text-foreground">
      <div className="mb-8 border-b border-(--wrapper) pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-(--blueText)">
          ระบบพรีวิวข้อมูล Excel บุคคลสูญหาย / รับแจ้งเหตุ
        </h1>
        <p className="text-(--header) opacity-70 mt-2">
          ระบบจะแปลงวันที่ให้ถูกต้อง และจะดาวน์โหลดรูปจากลิงก์เข้าสู่เซิร์ฟเวอร์โดยอัตโนมัติเมื่อกดบันทึก
        </p>
      </div>

      <form onSubmit={handlePreview} className="mb-8 p-6 bg-(--container) border border-(--wrapper) rounded-xl shadow-sm max-w-xl">
        <div className="flex flex-col gap-4">
          <label className="font-semibold text-sm text-(--blueText)">เลือกไฟล์ Excel ของคุณ (.xlsx, .xls)</label>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-(--button) file:text-(--header) hover:file:opacity-80 border border-(--wrapper) p-2 rounded-md bg-(--container) cursor-pointer w-full text-sm"
          />
          <button 
            type="submit" 
            disabled={loading || isUploading}
            className="w-full bg-(--blueText) text-(--button) py-2.5 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition shadow-sm text-sm"
          >
            {loading ? 'กำลังประมวลผลและอ่านไฟล์...' : 'พรีวิวข้อมูล (ยังไม่บันทึก)'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-6 bg-(--redBG) text-(--redText) border border-(--redBorder) rounded-lg text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="p-6 border rounded-xl bg-(--container) shadow-sm border-(--wrapper)">
             <h3 className="font-bold text-lg mb-2 text-(--blueText)">ยืนยันการนำเข้าข้อมูล</h3>
             {isUploading ? (
                 <div className="w-full mt-4">
                     <div className="flex justify-between text-sm mb-1 font-semibold text-(--blueText)">
                         <span>กำลังบันทึกลง Database (และแอบดาวน์โหลดรูปภาพ... อาจใช้เวลาสักครู่)</span>
                         <span>{progress.current} / {progress.total || result.total_rows} รายการ</span>
                     </div>
                     <div className="w-full bg-(--wrapper) rounded-full h-3">
                         <div 
                            className="bg-(--blueText) h-3 rounded-full transition-all duration-300" 
                            style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' } as React.CSSProperties}
                         ></div>
                     </div>
                 </div>
             ) : (
                 <button onClick={handleConfirmUpload} className="w-full bg-(--greenBG) text-(--greenText) border border-(--greenBorder) py-3 px-4 rounded-lg font-bold hover:opacity-90 transition shadow-md mt-2">
                     ยืนยันบันทึกลงฐานข้อมูลและดึงรูปภาพ
                 </button>
             )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-xl text-(--header)">
                 🔍 ตารางพรีวิวข้อมูล ({result.total_rows} รายการ)
               </h3>
               {totalPages > 1 && (
                 <div className="flex items-center gap-4 bg-(--container) p-2 border border-(--wrapper) rounded-xl shadow-sm">
                   <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 bg-(--button) border border-(--wrapper) rounded-md disabled:opacity-50 text-sm hover:bg-(--wrapper)">ก่อนหน้า</button>
                   <span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
                   <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 bg-(--button) border border-(--wrapper) rounded-md disabled:opacity-50 text-sm hover:bg-(--wrapper)">ถัดไป</button>
                 </div>
               )}
            </div>

            <div className="overflow-x-auto border border-(--wrapper) rounded-xl shadow-md bg-(--button)">
              <table className="w-full text-sm text-left border-collapse min-w-200">
                <thead className="bg-(--container) font-bold border-b border-(--wrapper) text-xs text-(--header) uppercase">
                  <tr>
                    <th className="p-4 border-r border-(--wrapper) w-16 text-center">แถวที่</th>
                    <th className="p-4 border-r border-(--wrapper) text-(--blueText) w-3/5">
                      ข้อมูลทั้งหมดที่จะถูกบันทึกลงระบบ
                    </th>
                    <th className="p-4 text-(--orangeText) w-2/5">
                      ข้อมูลดิบจาก Excel (Raw JSON)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--wrapper)">
                  {paginatedData?.map((row: any, idx: number) => {
                    // รวมชื่อ กองบังคับการ (บก.1 - 13) เพื่อแสดงผลในช่องเดียว
                    const divisions = [row.division_1, row.division_2, row.division_3, row.division_4, row.division_5, row.division_6, row.division_7, row.division_8, row.division_9, row.division_10, row.division_11, row.division_12, row.division_13].filter(Boolean).join(', ');

                    return (
                    <tr key={idx} className="hover:bg-(--row-hover) transition">
                      <td className="p-4 font-bold border-r border-(--wrapper) text-center align-top opacity-60">
                        {row.row_index}
                      </td>
                      <td className="p-4 border-r border-(--wrapper) bg-(--container) align-top text-(--header)">
                        
                        <div className="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-(--wrapper)">
                          {/* หมวดผู้แจ้งและการรับแจ้ง */}
                          <div>
                            <span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider block mb-1">หมวดผู้แจ้งและการรับแจ้ง</span>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">ผู้แจ้ง:</span> <span className="font-medium text-(--blueText)">{row.reporter_name || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">ID/Passport:</span> <span>{row.reporter_id_card || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">เบอร์โทร:</span> <span>{row.reporter_phone || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">อีเมล:</span> <span>{row.reporter_email || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">การติดต่ออื่น:</span> <span>{row.reporter_contact || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">ความสัมพันธ์:</span> <span>{row.relationship || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">วันที่รับแจ้ง:</span> <span className="text-orange-500 font-medium">{row.report_date || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-24 inline-block">ช่องทาง:</span> <span>{row.report_channel || renderNull()}</span></div>
                          </div>
                          
                          {/* หมวดตำรวจและหน่วยงาน */}
                          <div>
                            <span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider block mb-1">หมวดตำรวจและหน่วยงาน</span>
                            <div className="text-sm"><span className="opacity-50 w-32 inline-block">บช.ที่รับแจ้ง:</span> <span className="font-medium">{row.police_command || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-32 inline-block">กองบังคับการ(บก.):</span> <span className="font-medium">{divisions || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-32 inline-block">สถานีตำรวจ:</span> <span className="font-medium text-blue-600">{row.police_station || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-32 inline-block">สน./สภ.:</span> <span className="font-medium">{row.police_substation || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-32 inline-block">จนท.รับแจ้ง:</span> <span>{row.police_receiver || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-32 inline-block">พงส.:</span> <span>{row.investigator || renderNull()}</span></div>
                            <div className="text-sm mt-1"><span className="opacity-50 w-32 inline-block">เลขคดี:</span> <span className="font-mono text-(--blueText)">{row.case_no || renderNull()}</span></div>
                            <div className="text-sm"><span className="opacity-50 w-32 inline-block">เลข ปจว.:</span> <span className="font-mono text-purple-500">{row.pjv_number || renderNull()}</span></div>
                            <div className="text-sm flex items-center">
                              <span className="opacity-50 w-32 inline-block">ลิงก์แนบ ปจว.:</span> 
                              {row.pjv_file_url ? (
                                <a href={row.pjv_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs bg-blue-100/10 px-2 py-0.5 rounded border border-blue-200/20">
                                  🔗 เปิดดูไฟล์/รูปภาพ
                                </a>
                              ) : renderNull()}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-4 mb-3 pb-3 border-b border-(--wrapper)">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                              {/* หมวดผู้สูญหาย */}
                              <div>
                                <span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider block mb-1">หมวดผู้สูญหาย</span>
                                <div className="text-sm"><span className="opacity-50 w-28 inline-block">ชื่อผู้สูญหาย:</span> <span className="font-bold text-purple-500">{row.missing_person_name || renderNull()}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-28 inline-block">อายุ/เพศ:</span> <span>{row.age || '-'} ปี | เพศ: {row.gender || '-'}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-28 inline-block">สัญชาติ:</span> <span>{row.nationality || renderNull()}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-28 inline-block">ID/Passport:</span> <span className="font-mono">{row.missing_id_card || row.passport_id || renderNull()}</span></div>
                                
                                <div className="text-sm mt-2"><span className="opacity-50 w-28 inline-block">วันที่สูญหาย:</span> <span className="text-red-500 font-medium">{row.missing_date || renderNull()}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-28 inline-block">เวลาสูญหาย:</span> <span className="text-red-500 font-medium">{row.missing_time || renderNull()}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-28 inline-block">สถานที่สูญหาย:</span> <span>{row.missing_location || renderNull()}</span></div>
                              </div>
                              
                              {/* การเดินทางเข้า-ออก */}
                              <div>
                                <span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider block mb-1">การเดินทางเข้า-ออก</span>
                                <div className="text-sm"><span className="opacity-50 w-24 inline-block">ช่องทางเข้า:</span> <span>{row.entry_channel || renderNull()}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-24 inline-block">ด่าน/จังหวัด:</span> <span>{row.entry_checkpoint || renderNull()}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-24 inline-block">สายการบิน:</span> <span>{row.airline || renderNull()}</span></div>
                                <div className="text-sm"><span className="opacity-50 w-24 inline-block">วันที่เข้า:</span> <span className="text-orange-500 font-medium">{row.entry_date || renderNull()}</span></div>
                              </div>
                          </div>
                          
                          <div className="w-24 shrink-0 flex justify-center">
                              {row.photo_url ? renderDriveImage(row.photo_url) : (
                                  <div className="flex flex-col items-center justify-center opacity-30 h-full">
                                      <span className="text-3xl">📷</span>
                                      <span className="text-[10px] mt-1 text-center">ไม่มีรูปภาพ</span>
                                  </div>
                              )}
                          </div>
                        </div>

                        {/* พฤติการณ์ / ผลการปฏิบัติ */}
                        <div className="bg-(--button) rounded-lg p-3 border border-(--wrapper)">
                          <span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider block mb-2">พฤติการณ์ / การสืบสวน และ ผลการปฏิบัติ</span>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                             <div><span className="opacity-50 w-24 inline-block">สถานที่พบล่าสุด:</span> <span>{row.last_seen_location || renderNull()}</span></div>
                             <div><span className="opacity-50 w-24 inline-block">วันที่พบล่าสุด:</span> <span className="text-orange-500 font-medium">{row.last_seen_date || renderNull()}</span></div>
                             <div><span className="opacity-50 w-24 inline-block">ข้อบ่งชี้ค้ามนุษย์:</span> <span>{row.human_trafficking_indicator || renderNull()}</span></div>
                             <div><span className="opacity-50 w-24 inline-block">การดำเนินการ:</span> <span>{row.action_taken || renderNull()}</span></div>
                             <div><span className="opacity-50 w-24 inline-block">การคัดแยกเหยื่อ:</span> <span>{row.victim_screening || renderNull()}</span></div>
                             <div><span className="opacity-50 w-24 inline-block">ประเภทค้ามนุษย์:</span> <span>{row.trafficking_type || renderNull()}</span></div>
                          </div>
                          <div className="mt-2 text-sm border-t border-(--wrapper) pt-2">
                             <div className="mb-1"><span className="opacity-50">พฤติการณ์:</span> <span className="whitespace-pre-wrap block mt-1 bg-(--container) p-2 border rounded-md">{row.circumstances || renderNull()}</span></div>
                             <div className="mb-1"><span className="opacity-50">หมายเหตุ:</span> <span className="block mt-1">{row.note || renderNull()}</span></div>
                             <div className="mt-2 text-green-600 font-semibold"><span className="opacity-60 text-(--header)">ผลการปฏิบัติ:</span> {row.operation_result || renderNull()}</div>
                             {row.found_date && <div className="text-green-600 font-semibold mt-1"><span className="opacity-60 text-(--header)">วันที่พบตัว:</span> {row.found_date}</div>}
                          </div>
                        </div>

                      </td>

                      <td className="p-4 align-top bg-(--button)">
                        <pre className="text-xs font-mono bg-(--container) text-(--header) p-3 border border-(--wrapper) rounded-lg max-h-125 overflow-y-auto shadow-inner whitespace-pre-wrap sticky top-4">
                          {JSON.stringify(row.raw_data_from_excel, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}