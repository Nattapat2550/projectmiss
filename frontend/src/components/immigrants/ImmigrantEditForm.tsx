import React from "react";
import { Save, X } from "lucide-react";

export default function ImmigrantEditForm({ 
  personType, formData, isSaving, imagePreview, 
  handlers, onCancel 
}: any) {
  const { handleInputChange, handleCheckboxChange, handleImageChange, handleSave } = handlers;
  
  // 🟢 บังคับใช้ !text-black dark:!text-white
  const inputClass = "w-full border p-2 rounded bg-background !text-black dark:!text-white border-(--wrapper)";
  const labelClass = "block text-xs font-bold mb-2 !text-black dark:!text-white";

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto bg-(--container) border border-(--wrapper) rounded-2xl p-6 md:p-8 shadow-sm transition-colors mb-12">
      <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3">รูปภาพประจำตัว</h3>
      <div className="mb-6 flex flex-col items-start gap-4">
        {imagePreview && <img src={imagePreview} alt="Preview" referrerPolicy="no-referrer" className="h-40 w-40 object-cover rounded-xl border border-(--wrapper) shadow-sm" />}
        {/* 🟢 บังคับใช้สี text เป็นขาว และปรับพื้นหลังปุ่ม */}
        <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-slate-800 dark:file:bg-slate-600 file:text-white! cursor-pointer" />
      </div>

      <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">ข้อมูลส่วนบุคคลและชื่อ-นามสกุล</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>ชื่อต้นภาษาไทย *</label><input type="text" name="first_name_th" value={formData.first_name_th || ""} onChange={handleInputChange} required className={inputClass} /></div>
        <div><label className={labelClass}>ชื่อกลางภาษาไทย</label><input type="text" name="middle_name_th" value={formData.middle_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>นามสกุลภาษาไทย *</label><input type="text" name="last_name_th" value={formData.last_name_th || ""} onChange={handleInputChange} required className={inputClass} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>ชื่อต้นภาษาอังกฤษ</label><input type="text" name="first_name_en" value={formData.first_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>ชื่อกลางภาษาอังกฤษ</label><input type="text" name="middle_name_en" value={formData.middle_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>นามสกุลภาษาอังกฤษ</label><input type="text" name="last_name_en" value={formData.last_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>เลขหนังสือเดินทาง</label><input type="text" name="passport_id" value={formData.passport_id || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>สัญชาติ</label><input type="text" name="nationality" value={formData.nationality || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>เพศ</label>
            <select name="gender" value={formData.gender || ""} onChange={handleInputChange} className={inputClass}>
              <option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
            </select>
        </div>
      </div>
      
      {personType === "repatriated" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>วันเดือนปีเกิด</label><input type="date" name="date_of_birth" value={formData.date_of_birth || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>อายุปัจจุบัน (ปี)</label><input type="number" name="age" value={formData.age || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>เลขประจำตัวประชาชน *</label><input type="text" name="national_id" value={formData.national_id || ""} onChange={handleInputChange} required className={inputClass} /></div>
          </div>

          <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">รายละเอียดที่อยู่และการทำงาน</h3>
          <div className="mb-5">
            <label className={labelClass}>ภูมิลำเนา / ที่อยู่</label>
            <textarea name="address" value={formData.address || ""} onChange={handleInputChange} rows={2} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>อาคาร (Building)</label><input type="text" name="building" value={formData.building || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ชั้น (Floor)</label><input type="text" name="floor" value={formData.floor || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ห้อง (Room)</label><input type="text" name="room" value={formData.room || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>ประเภทงาน (Job Type)</label><input type="text" name="job_type" value={formData.job_type || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>หน้าที่ (Role)</label><input type="text" name="role" value={formData.role || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>เงินเดือน (Salary)</label><input type="number" name="salary" value={formData.salary || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>จ่ายโดย (Paid By)</label><input type="text" name="paid_by" value={formData.paid_by || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>วิธีชำระเงิน (Payment Method)</label><input type="text" name="payment_method" value={formData.payment_method || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">รายละเอียดการส่งตัวและคดีความ</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>วันที่ส่งกลับประเทศ</label><input type="date" name="return_date" value={formData.return_date || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>จำนวนเคสคดี</label><input type="number" name="number_of_case" value={formData.number_of_case || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>จำนวนหมายจับ</label><input type="number" name="number_of_warrant" value={formData.number_of_warrant || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>ช่องทางส่งกลับ</label><input type="text" name="channel" value={formData.channel || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>หน่วยงานที่รับผิดชอบ</label><input type="text" name="responsible_agency" value={formData.responsible_agency || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-5 mb-5">
            <div><label className={labelClass}>สถานะผลลัพธ์คดี</label>
               <select name="result" value={formData.result || "PENDING"} onChange={handleInputChange} className={inputClass}>
                 <option value="PENDING">PENDING</option><option value="SUCCESS">SUCCESS</option><option value="FAILED">FAILED</option>
               </select>
             </div>
          </div>

          <div className="mb-5 flex items-center gap-2 bg-background p-4 rounded-xl border border-(--wrapper)">
            <input type="checkbox" id="victim_indicator" name="victim_indicator" checked={formData.victim_indicator === true || formData.victim_indicator === "true"} onChange={handleCheckboxChange} className="w-4 h-4 cursor-pointer" />
            <label htmlFor="victim_indicator" className="text-sm font-bold cursor-pointer text-black! dark:text-white!">เข้าข่ายเป็นผู้เสียหายตกเป็นเหยื่อจากการค้ามนุษย์ (Victim Indicator)</label>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">รายละเอียดจุดตรวจเจอและการคัดกรอง</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
             <div><label className={labelClass}>วันที่ตรวจพบ</label><input type="date" name="detected_date" value={formData.detected_date || ""} onChange={handleInputChange} className={inputClass} /></div>
             <div><label className={labelClass}>สถานที่ตรวจเจอพิกัด *</label><input type="text" name="detected_location" value={formData.detected_location || ""} onChange={handleInputChange} required className={inputClass} /></div>
             <div><label className={labelClass}>สถานที่ทำงานปลายทาง</label><input type="text" name="workplace" value={formData.workplace || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          
          <div className="mb-5 flex items-center gap-2 bg-background p-4 rounded-xl border border-(--wrapper)">
            <input type="checkbox" id="is_victim" name="is_victim" checked={formData.is_victim === true || formData.is_victim === "true"} onChange={handleCheckboxChange} className="w-4 h-4 cursor-pointer" />
            <label htmlFor="is_victim" className="text-sm font-bold cursor-pointer text-black! dark:text-white!">เข้าข่ายเป็นผู้เสียหายตกเป็นเหยื่อจากการค้ามนุษย์</label>
          </div>

          <div className="mb-5">
            <label className={labelClass}>บันทึกรายละเอียดผลการคัดกรอง</label>
            <textarea name="screening_details" value={formData.screening_details || ""} onChange={handleInputChange} rows={3} className={inputClass} />
          </div>
        </>
      )}

      <div className="mb-5">
        <label className={labelClass}>หมายเหตุเพิ่มเติม (Note)</label>
        <textarea name="note" value={formData.note || ""} onChange={handleInputChange} rows={3} className={inputClass} />
      </div>

      <div className="flex justify-end gap-3 border-t border-(--wrapper) pt-6 mt-8">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 bg-stone-200 dark:bg-stone-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer"><X size={16} /> ยกเลิก</button>
        <button type="submit" disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer disabled:opacity-50"><Save size={16} /> {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button>
      </div>
    </form>
  );
}