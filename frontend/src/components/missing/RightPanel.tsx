"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';

interface RightPanelProps {
  data: any;
  note: string;
  setNote: (value: string) => void;
  onEditClick: () => void; 
}

export default function RightPanel({ data, note, setNote, onEditClick }: RightPanelProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const handleSaveNote = async () => {
    try {
      setIsSavingNote(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      // Use PUT to update the missing person. For now, since we only want to update the note,
      // we need to make sure our backend handles partial updates or we send the full payload.
      // We will create/modify the PUT endpoint to handle note updates.
      const submitData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && typeof data[key] !== 'object') {
          submitData.append(key, String(data[key]));
        }
      });
      submitData.set('notes', note); // Update the note

      const res = await fetch(`${backendUrl}/api/v1/missing/${data.missing_person_id}`, {
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
      text: "ยืนยันที่จะลบข้อมูลผู้สูญหายรายนี้ออกจากระบบอย่างถาวร?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // สีแดง (Danger)
      cancelButtonColor: '#6b7280',  // สีเทา (Cancel)
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    try {
      setIsDeleting(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const res = await fetch(`${backendUrl}/api/v1/missing/${data.missing_person_id}`, {
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
        
        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-bold text-(--header) mb-2">ข้อมูลคดี</h3>
          
          <div className={`w-full text-center py-2 px-4 rounded-lg font-bold text-sm border shadow-sm ${data.found_date ? 'bg-green-100 text-green-700 border-green-300' : 'bg-(--redBG) text-(--redText) border-(--redBorder)'}`}>
            {data.found_date ? `พบตัวแล้ว (${formatDate(data.found_date)})` : "ยังไม่พบตัว"}
          </div>

          <div className="flex justify-between items-center text-sm border-b border-(--wrapper) pb-2 mt-4">
            <span className="font-bold text-(--foreground) dark:text-slate-300">วันที่รับแจ้ง</span>
            <span className="font-mono font-semibold">{formatDate(data.reported_date)}</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-(--wrapper) pb-2">
            <span className="font-bold text-(--foreground) dark:text-slate-300">สถานีตำรวจ</span>
            <span className="font-semibold">{data.police_station || "-"}</span>
          </div>

          <div className="flex justify-between items-center text-sm border-b border-(--wrapper) pb-2">
            <span className="font-bold text-(--foreground) dark:text-slate-300">พนักงานสอบสวน</span>
            <span className="font-semibold">{data.investigating_officer || "-"}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm border-b border-(--wrapper) pb-2">
            <span className="font-bold text-(--foreground) dark:text-slate-300">ผลการปฏิบัติ</span>
            <span className="font-semibold">{data.operation_result || "-"}</span>
          </div>

          {data.human_trafficking_indicators || data.victim_classification ? (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
               <span className="font-bold">ข้อมูลการค้ามนุษย์:</span><br/>
               {data.human_trafficking_indicators && <span>- ข้อบ่งชี้: {data.human_trafficking_indicators}<br/></span>}
               {data.victim_classification && <span>- การคัดแยกเหยื่อ: {data.victim_classification}</span>}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 mt-6 border-t border-(--wrapper) pt-4">
          <label className="text-lg font-bold text-(--header)">หมายเหตุระบบ</label>
          <textarea
            value={note || ""}
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