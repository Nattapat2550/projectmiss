'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import UploadPreviewTable from '@/components/missing/UploadPreviewTable';

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
          <label className="font-semibold text-sm text-(--blueText)">เลือกไฟล์ Excel หรือ Word ของคุณ (.xlsx, .xls, .docx)</label>
          <input 
            type="file" 
            accept=".xlsx, .xls, .docx" 
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

          <UploadPreviewTable 
              paginatedData={paginatedData}
              currentPage={currentPage}
              totalPages={totalPages}
              totalRows={result.total_rows}
              setCurrentPage={setCurrentPage}
          />
          
        </div>
      )}
    </div>
  );
}