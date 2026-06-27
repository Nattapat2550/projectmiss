"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';
interface RightPanelProps {
  type: "repatriated" | "illegal";
  data: any;
  note: string;
  setNote: (value: string) => void;
  onEditClick: () => void; 
}

export default function RightPanel({ type, data, note, setNote, onEditClick }: RightPanelProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const handleSaveNote = async () => {
    try {
      setIsSavingNote(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const endpoint = type === "repatriated" ? "repatriated" : "illegal";
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      // 🟢 กลับมาใช้ FormData เพื่อให้เข้ากับ Multer ของ Backend
      const submitData = new FormData();
      const payload = { ...data, note: note };

      // ฟอร์แมตวันที่และตัวเลข
      if (type === "repatriated") {
        payload.number_of_case = parseInt(payload.number_of_case) || 0;
        payload.number_of_warrant = parseInt(payload.number_of_warrant) || 0;
        payload.age = parseInt(payload.age) || "";
        if (payload.date_of_birth) payload.date_of_birth = String(payload.date_of_birth).split("T")[0];
        if (payload.return_date) payload.return_date = String(payload.return_date).split("T")[0];
      } else {
        if (payload.detected_date) payload.detected_date = String(payload.detected_date).split("T")[0];
      }

      // นำข้อมูลเข้า FormData อย่างปลอดภัย (ตัด null/undefined ออก)
      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined && typeof payload[key] !== 'object') {
          submitData.append(key, String(payload[key]));
        }
      });

      // 🟢 ส่งข้อมูลแบบไร้ Content-Type (ให้ Browser ตั้งค่า Boundary เองสำหรับ FormData)
      const res = await fetch(`${backendUrl}/api/v1/immigrants/${endpoint}/${data.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.message || err.error || "Failed to save note to database");
      }

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'บันทึกหมายเหตุระบบเรียบร้อยแล้ว!',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error: any) {
      console.error("Error saving note:", error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: `เกิดข้อผิดพลาดในการบันทึกหมายเหตุ: ${error.message}`
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDelete = async () => {
    
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "ยืนยันที่จะลบประวัติของบุคคลนี้ออกจากระบบอย่างถาวร?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // สีแดง (Danger)
      cancelButtonColor: '#6b7280',  // สีเทา (Cancel)
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    });

    // ถ้าผู้ใช้กด "ยกเลิก" หรือปิดหน้าต่าง ให้หยุดการทำงาน (return ออกไป)
    if (!result.isConfirmed) return;

    try {
      setIsDeleting(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const endpoint = type === "repatriated" ? "repatriated" : "illegal";
      
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const res = await fetch(`${backendUrl}/api/v1/immigrants/${endpoint}/${data.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error("Failed to delete from database");
      }

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'ลบข้อมูลออกจากระบบเสร็จสิ้น',
        timer: 1500,
        showConfirmButton: false
      });
      router.back(); 
      router.refresh();

    } catch (error) {
      console.error("Error deleting record:", error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'เกิดข้อผิดพลาดในการส่งคำสั่งลบข้อมูลไปยังฐานข้อมูล'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="bg-(--container) border border-(--wrapper) rounded-2xl p-6 shadow-sm transition-colors">
        
        {type === "repatriated" ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-(--header) mb-2">ข้อมูลเพิ่มเติม</h3>
            
            <div className="flex justify-between items-center text-sm border-b border-(--wrapper) pb-2">
              <span className="font-bold text- (--foreground) ]dark:text-slate-300">วันที่ส่งกลับ</span>
              <span className="font-mono font-semibold">{formatDate(data.return_date)}</span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-(--wrapper) pb-2">
              <span className="font-bold text- (--foreground) ]dark:text-slate-300">จำนวน Case ID</span>
              <span className="font-semibold font-mono">{data.number_of_case ?? 0}</span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-(--wrapper) pb-2">
              <span className="font-bold text- (--foreground) ]dark:text-slate-300">จำนวนหมายจับ</span>
              <span className={`font-semibold font-mono ${data.number_of_warrant > 0 ? "text-(--redText)" : ""}`}>
                {data.number_of_warrant ?? 0}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm pb-1">
              <span className="font-bold text- (--foreground) ]dark:text-slate-300">ช่องทางส่งกลับ</span>
              <span className="font-semibold">{data.channel || "-"}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-(--header) mb-2">ข้อมูลคัดกรอง</h3>
            
            <div className={`w-full text-center py-2 px-4 rounded-lg font-bold text-sm border shadow-sm ${data.is_victim ? 'bg-red-100 text-red-700 border-red-300' : 'bg-(--yellowBG) text-(--yellowText) border-(--yellowBorder)'}`}>
              {data.is_victim ? "เข้าข่ายเป็นผู้เสียหายจากการค้ามนุษย์" : "ไม่เป็นผู้เสียหายจากการค้ามนุษย์"}
            </div>

            <div className="bg-background border border-(--wrapper) rounded-md p-3 text-xs text- (--foreground) ]dark:text-slate-300 font-medium leading-relaxed shadow-inner min-h-15 mt-2 whitespace-pre-wrap">
              {data.screening_details || "ไม่มีรายละเอียดการคัดกรองระบุไว้"}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-6 border-t border-(--wrapper) pt-4">
          <label className="text-lg font-bold text-(--header)">หมายเหตุระบบ</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full bg-background border border-(--wrapper) text-foreground rounded-md p-3 text-xs focus:outline-none focus:ring-2 focus:ring-(--header)/40 shadow-inner"
            placeholder="ไม่มีบันทึกหมายเหตุ..."
          />
          <button
            onClick={handleSaveNote}
            disabled={isSavingNote}
            className="w-full py-2 bg-(--wrapper) text-foreground hover:opacity-90 font-bold rounded-md active:scale-[0.99] transition text-xs shadow-sm cursor-pointer mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingNote ? "กำลังบันทึก..." : "บันทึก/อัปเดตหมายเหตุ"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onEditClick}
          className="py-2.5 rounded-lg font-bold text-center text-sm border bg-(--yellowBG) text-(--yellowText) border-(--yellowBorder) hover:opacity-90 active:scale-95 transition shadow-sm cursor-pointer"
        >
          แก้ไขข้อมูล
        </button>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`py-2.5 rounded-lg font-bold text-center text-sm border bg-(--redBG) text-(--redText) border-(--redBorder) hover:opacity-90 active:scale-95 transition shadow-sm ${isDeleting ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {isDeleting ? "กำลังลบ..." : "ลบข้อมูล"}
        </button>
      </div>
    </div>
  );
}