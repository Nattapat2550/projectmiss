import React, { useState } from "react";
import { Save, X, Camera as ImageIcon } from "lucide-react";
import SingleImageField from "@/components/form/single-image-field";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import { ALL_NATIONALITIES } from "@/constants/nationalities";
import { useAddressOptions } from "@/hooks/useAddressOptions";
import { useAgenciesOptions } from "@/hooks/useAgenciesOptions";

export default function MissingEditForm({ 
  formData, isSaving, imagePreview, imageFile,
  handlers, onCancel 
}: any) {
  const { handleInputChange, handleImageChange, handleSave, handleImageRemove } = handlers;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const handleActiveDivisionTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    handleInputChange({ target: { name: "division_type", value: newType } } as any);
    handleInputChange({ target: { name: "division_name", value: "" } } as any);
  };

  // 🟢 ฟังก์ชันแปลงลิงก์อัจฉริยะ (ดึงมาจากหน้าการ์ดที่แสดงผลได้สำเร็จ)
  const getFullImageUrl = (url: string) => {
    if (!url) return null;
    if (url.startsWith("blob:")) return url; // ถ้าเป็นรูปที่เพิ่งกดเลือกจากเครื่อง ให้โชว์ตรงๆ
    if (url.startsWith("data:")) return url;

    let driveId = "";
    
    // ดักจับและแกะ ID ของ Google Drive
    const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFileD && matchFileD[1]) {
      driveId = matchFileD[1];
    } else {
      const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        driveId = matchId[1];
      }
    }

    // ถ้าเป็น Google Drive ให้แปลงเป็น Thumbnail + ผ่าน Proxy แก้ CORS
    if (driveId) {
      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`;
      return `https://wsrv.nl/?url=${encodeURIComponent(thumbnailUrl)}`;
    }
    
    // ถ้าเป็นลิงก์ภายนอกอื่นๆ ให้ผ่าน Proxy แก้ CORS
    if (url.startsWith("http")) {
      return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
    }
    
    // ถ้าเป็น Path รูปในระบบ Backend ของเราเอง
    const fullUrl = `${backendUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    return `https://wsrv.nl/?url=${encodeURIComponent(fullUrl)}`;
  };

  const inputClass = "w-full border px-3 py-1.5 text-sm rounded-sm bg-background !text-black dark:!text-white border-(--wrapper) focus:outline-none transition-all";
  const labelClass = "block text-xs font-semibold mb-1.5 !text-black dark:!text-white opacity-80";
  const { provinces: detProvinces, districtOptions: detDistrictOptions, subDistrictOptions: detSubDistrictOptions } = useAddressOptions(formData.detected_location_province, formData.detected_location_district);
  const { commandCenterOptions, divisionOptions, stationOptions } = useAgenciesOptions(formData.command_center, formData.division_type, formData.division_name, formData.station);

  const handleSelectDetDistrict = (opt: any) => {
    const { district, province } = opt.extra;
    handleInputChange({ target: { name: "detected_location_district", value: district } } as any);
    handleInputChange({ target: { name: "detected_location_province", value: province } } as any);
  };

  const handleSelectDetSubDistrict = (opt: any) => {
    const { subDistrict, district, province } = opt.extra;
    handleInputChange({ target: { name: "detected_location_sub_district", value: subDistrict } } as any);
    handleInputChange({ target: { name: "detected_location_district", value: district } } as any);
    handleInputChange({ target: { name: "detected_location_province", value: province } } as any);
  };

  const isHumanTrafficking = formData.human_trafficking_indicators === true || formData.human_trafficking_indicators === "true";
  const isOperationResult = formData.operation_result === true || formData.operation_result === "true";

  const defaultImage = "/return.png";
  const displayImage = imagePreview ? getFullImageUrl(imagePreview) : defaultImage;

  return (
    <div className="max-w-2xl mx-auto my-4 bg-(--container) rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden">
      <div className="p-6 sm:p-8">
        <form onSubmit={handleSave} className="w-full">
          {/* ---------------- รูปภาพ ---------------- */}
          <div className="grid grid-cols-1 gap-8 mb-6 p-6 rounded-xl">
            <div>
              <h3 className="text-lg font-bold mb-4 !text-black dark:!text-white">รูปภาพบุคคลสูญหาย</h3>
              <div className="flex flex-col items-start gap-4">
                <img 
                  src={displayImage || defaultImage} 
                  alt="Preview" 
                  referrerPolicy="no-referrer" 
                  onError={(e) => { e.currentTarget.src = defaultImage; }}
                  className="h-40 w-40 object-cover rounded-xl shadow-sm bg-white border border-gray-200 p-1" 
                />
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md cursor-pointer hover:opacity-90 text-sm">
                    <ImageIcon size={16} /> {imagePreview ? "แก้ไขรูปภาพ" : "อัปโหลดรูปภาพ"}
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  {imagePreview && (
                    <button type="button" onClick={handleImageRemove} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer">
                      <X size={16} /> ลบรูปภาพ
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลบุคคลสูญหาย</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>ชื่อต้น (ไทย) *</label><input required type="text" name="missing_first_name_th" value={formData.missing_first_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ชื่อกลาง (ไทย)</label><input type="text" name="missing_middle_name_th" value={formData.missing_middle_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>นามสกุล (ไทย) *</label><input required type="text" name="missing_last_name_th" value={formData.missing_last_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>ชื่อต้น (อังกฤษ)</label><input type="text" name="missing_first_name_en" value={formData.missing_first_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ชื่อกลาง (อังกฤษ)</label><input type="text" name="missing_middle_name_en" value={formData.missing_middle_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>นามสกุล (อังกฤษ)</label><input type="text" name="missing_last_name_en" value={formData.missing_last_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>วันเกิด (แปลงจากอายุอัตโนมัติ)</label><input type="date" name="date_of_birth" value={formData.date_of_birth ? formData.date_of_birth.substring(0, 10) : ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>เพศ</label>
              <select name="gender" value={formData.gender || ""} onChange={handleInputChange} className={inputClass}>
                <option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
              </select>
            </div>
            <div><label className={labelClass}>สัญชาติ (Nationality)</label><AutocompleteInput name="nationality" value={formData.nationality || ""} options={ALL_NATIONALITIES} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>เลขประจำตัวประชาชน/พาสปอร์ต</label><input type="text" name="missing_id_card_passport" value={formData.missing_id_card_passport || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>หมายเลขหนังสือเดินทาง (ถ้ามี)</label><input type="text" name="passport_number" value={formData.passport_number || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลการเดินทางเข้า (ถ้ามี)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>ช่องทางที่เดินทางเข้า</label><input type="text" name="entry_channel" value={formData.entry_channel || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ชื่อด่านและจังหวัดที่เดินทางเข้า</label><input type="text" name="entry_checkpoint_province" value={formData.entry_checkpoint_province || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>สายการบิน (ถ้ามี)</label><input type="text" name="airline" value={formData.airline || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>วันที่เดินทางเข้า</label><input type="date" name="entry_date" value={formData.entry_date ? formData.entry_date.substring(0, 10) : ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">รายละเอียดการสูญหาย</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>วันที่สูญหาย</label><input type="date" name="missing_date" value={formData.missing_date ? formData.missing_date.substring(0, 10) : ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>เวลาที่คาดว่าสูญหาย</label><input type="time" name="missing_time" value={formData.missing_time || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="mb-5">
            <label className={labelClass}>สถานที่พบเห็นครั้งสุดท้าย (รายละเอียด) *</label>
            <textarea required name="detected_location_details" value={formData.detected_location_details || ""} onChange={handleInputChange} rows={2} className={inputClass} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>จังหวัด</label><AutocompleteInput name="detected_location_province" value={formData.detected_location_province || ""} options={detProvinces} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>เขต/อำเภอ</label><AutocompleteInput name="detected_location_district" value={formData.detected_location_district || ""} options={detDistrictOptions} onChange={handleInputChange} onSelectOption={handleSelectDetDistrict} className={inputClass} /></div>
            <div><label className={labelClass}>แขวง/ตำบล</label><AutocompleteInput name="detected_location_sub_district" value={formData.detected_location_sub_district || ""} options={detSubDistrictOptions} onChange={handleInputChange} onSelectOption={handleSelectDetSubDistrict} className={inputClass} /></div>
          </div>

          <div className="mb-5">
            <label className={labelClass}>พฤติการณ์โดยสังเขป (Incident Summary)</label>
            <textarea name="incident_summary" value={formData.incident_summary || ""} onChange={handleInputChange} rows={3} className={inputClass} />
          </div>

          <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลการรับแจ้ง</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>ชื่อต้น (ไทย) (ผู้แจ้ง)</label><input type="text" name="informant_first_name_th" value={formData.informant_first_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ชื่อกลาง (ไทย) (ผู้แจ้ง)</label><input type="text" name="informant_middle_name_th" value={formData.informant_middle_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>นามสกุล (ไทย) (ผู้แจ้ง)</label><input type="text" name="informant_last_name_th" value={formData.informant_last_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>ชื่อต้น (อังกฤษ) (ผู้แจ้ง)</label><input type="text" name="informant_first_name_en" value={formData.informant_first_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ชื่อกลาง (อังกฤษ) (ผู้แจ้ง)</label><input type="text" name="informant_middle_name_en" value={formData.informant_middle_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>นามสกุล (อังกฤษ) (ผู้แจ้ง)</label><input type="text" name="informant_last_name_en" value={formData.informant_last_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>วันเกิด (ผู้แจ้ง)</label><input type="date" name="informant_date_of_birth" value={formData.informant_date_of_birth ? formData.informant_date_of_birth.substring(0, 10) : ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>เพศ (ผู้แจ้ง)</label>
              <select name="informant_gender" value={formData.informant_gender || ""} onChange={handleInputChange} className={inputClass}>
                <option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
              </select>
            </div>
            <div><label className={labelClass}>สัญชาติ (ผู้แจ้ง)</label><AutocompleteInput name="informant_nationality" value={formData.informant_nationality || ""} options={ALL_NATIONALITIES} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>เลขประจำตัวประชาชน (ผู้แจ้ง)</label><input type="text" name="informant_id_card_passport" value={formData.informant_id_card_passport || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ความสัมพันธ์</label><input type="text" name="relationship" value={formData.relationship || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>เบอร์โทรศัพท์ (ผู้แจ้ง)</label><input type="text" name="informant_phone" value={formData.informant_phone || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>อีเมล (ผู้แจ้ง)</label><input type="email" name="informant_email" value={formData.informant_email || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          
          <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">สถานีตำรวจที่รับแจ้ง</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>บช.</label><AutocompleteInput name="command_center" value={formData.command_center || ""} options={commandCenterOptions} onChange={handleInputChange} className={inputClass} /></div>
            
            <div className="flex flex-col lg:flex-row gap-2 col-span-1">
              <div className="w-full lg:w-1/3">
                <label className={labelClass}>เลือก บก.</label>
                <select value={formData.division_type || "division_1"} onChange={handleActiveDivisionTypeChange} className={inputClass}>
                  {[...Array(13)].map((_, i) => (
                    <option key={i} value={`division_${i+1}`}>บก. {i+1}</option>
                  ))}
                </select>
              </div>
              <div className="w-full lg:w-2/3">
                <label className={labelClass}>ชื่อ บก.</label>
                <AutocompleteInput name="division_name" value={formData.division_name || ""} options={divisionOptions} onChange={handleInputChange} className={inputClass} placeholder="ไม่ระบุ" />
              </div>
            </div>

            <div><label className={labelClass}>สน./สภ.</label><AutocompleteInput name="station" value={formData.station || ""} options={stationOptions} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div className="col-span-1 md:col-span-2"><label className={labelClass}>ชื่อพนักงานสอบสวน/ตำรวจ (ไม่ต้องมียศ)</label><input type="text" name="officer_name" value={formData.officer_name} onChange={handleInputChange} className={inputClass} /></div>
                      </div>

          <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลคดีและการดำเนินการ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>วันที่รับแจ้งความ</label><input type="date" name="reported_date" value={formData.reported_date ? formData.reported_date.substring(0, 10) : ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ช่องทางการรับแจ้ง</label><input type="text" name="receiving_channel" value={formData.receiving_channel || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>เลขคดี</label><input type="text" name="case_number" value={formData.case_number || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>เลข ปจว.</label><input type="text" name="pjv_number" value={formData.pjv_number || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ลิงก์ไฟล์ ปจว. (ถ้ามี)</label><input type="text" name="pjv_file_url" value={formData.pjv_file_url || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="mb-5 flex items-center gap-2 bg-background p-4 rounded-xl border border-(--wrapper)">
            <input type="checkbox" id="operation_result" name="operation_result" checked={isOperationResult} onChange={(e) => handleInputChange({ target: { name: "operation_result", value: e.target.checked }} as any)} className="w-4 h-4 cursor-pointer" />
            <label htmlFor="operation_result" className="text-sm font-bold cursor-pointer !text-black dark:!text-white">พบตัวแล้ว (ผลการปฏิบัติ)</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div><label className={labelClass}>วันที่พบตัว</label><input type="date" name="found_date" value={formData.found_date ? formData.found_date.substring(0, 10) : ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="mb-5 flex items-center gap-2 bg-background p-4 rounded-xl border border-(--wrapper)">
            <input type="checkbox" id="human_trafficking_indicators" name="human_trafficking_indicators" checked={isHumanTrafficking} onChange={(e) => handleInputChange({ target: { name: "human_trafficking_indicators", value: e.target.checked }} as any)} className="w-4 h-4 cursor-pointer" />
            <label htmlFor="human_trafficking_indicators" className="text-sm font-bold cursor-pointer !text-black dark:!text-white">มีข้อบ่งชี้การค้ามนุษย์ (Human Trafficking Indicator)</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div><label className={labelClass}>การคัดแยกเหยื่อ</label><input type="text" name="victim_classification" value={formData.victim_classification || ""} onChange={handleInputChange} className={inputClass} /></div>
            <div><label className={labelClass}>ประเภทของการค้ามนุษย์</label><input type="text" name="human_trafficking_type" value={formData.human_trafficking_type || ""} onChange={handleInputChange} className={inputClass} /></div>
          </div>

          <div className="mb-5">
            <label className={labelClass}>การดำเนินการ (Action Taken)</label>
            <textarea name="action_taken" value={formData.action_taken || ""} onChange={handleInputChange} rows={3} className={inputClass} />
          </div>

          <div className="mb-5">
            <label className={labelClass}>หมายเหตุ (Notes)</label>
            <textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} rows={2} className={inputClass} />
          </div>

          <div className="flex justify-end gap-3 border-t border-(--wrapper) pt-6 mt-8">
            <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 bg-stone-200 dark:bg-stone-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer">
              <X size={16} /> ยกเลิก
            </button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 bg-(--header) text-background font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer disabled:opacity-50">
              <Save size={16} /> {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
