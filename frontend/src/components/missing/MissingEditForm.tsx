import React from "react";
import { Save, X } from "lucide-react";
import { useAddressOptions } from "@/hooks/useAddressOptions";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import { ALL_NATIONALITIES } from "@/constants/nationalities";

export default function MissingEditForm({ 
  formData, isSaving, imagePreview,
  handlers, onCancel 
}: any) {
  const { handleInputChange, handleImageChange, handleSave } = handlers;
  
  // 🟢 บังคับใช้ !text-black dark:!text-white
  const inputClass = "w-full border p-2 rounded bg-background !text-black dark:!text-white border-(--wrapper)";
  const labelClass = "block text-xs font-bold mb-2 !text-black dark:!text-white";

  const { provinces: detProvinces, districtOptions: detDistrictOptions, subDistrictOptions: detSubDistrictOptions } = useAddressOptions(formData.detected_location_province || "", formData.detected_location_district || "");

  const handleSelectDetDistrict = (opt: any) => {
    const { district, province } = opt.extra;
    handleInputChange({ target: { name: "detected_location_district", value: district } });
    handleInputChange({ target: { name: "detected_location_province", value: province } });
  };

  const handleSelectDetSubDistrict = (opt: any) => {
    const { subDistrict, district, province } = opt.extra;
    handleInputChange({ target: { name: "detected_location_sub_district", value: subDistrict } });
    handleInputChange({ target: { name: "detected_location_district", value: district } });
    handleInputChange({ target: { name: "detected_location_province", value: province } });
  };


  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto bg-(--container) border border-(--wrapper) rounded-2xl p-6 md:p-8 shadow-sm transition-colors mb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3">รูปภาพผู้สูญหาย</h3>
          <div className="mb-6 flex flex-col items-start gap-4">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" referrerPolicy="no-referrer" className="h-40 w-40 object-cover rounded-xl border border-(--wrapper) shadow-sm" />
            ) : (
              <div className="h-40 w-40 rounded-xl border border-(--wrapper) shadow-sm bg-background flex items-center justify-center">
                 <img src="/user.png" className="w-1/2 opacity-40" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-slate-800 dark:file:bg-slate-600 file:text-white! cursor-pointer" />
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">ข้อมูลผู้สูญหาย</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>ชื่อต้นภาษาไทย *</label><input type="text" name="missing_first_name_th" value={formData.missing_first_name_th || ""} onChange={handleInputChange} required className={inputClass} /></div>
        <div><label className={labelClass}>ชื่อกลางภาษาไทย</label><input type="text" name="missing_middle_name_th" value={formData.missing_middle_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>นามสกุลภาษาไทย *</label><input type="text" name="missing_last_name_th" value={formData.missing_last_name_th || ""} onChange={handleInputChange} required className={inputClass} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>ชื่อต้นภาษาอังกฤษ</label><input type="text" name="missing_first_name_en" value={formData.missing_first_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>ชื่อกลางภาษาอังกฤษ</label><input type="text" name="missing_middle_name_en" value={formData.missing_middle_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>นามสกุลภาษาอังกฤษ</label><input type="text" name="missing_last_name_en" value={formData.missing_last_name_en || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>อายุ</label><input type="number" name="age" value={formData.age || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>เพศ</label>
            <select name="gender" value={formData.gender || ""} onChange={handleInputChange} className={inputClass}>
              <option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
            </select>
        </div>
        <div><label className={labelClass}>สัญชาติ</label><AutocompleteInput name="nationality" value={formData.nationality || ""} options={ALL_NATIONALITIES} onChange={handleInputChange} className={inputClass} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div><label className={labelClass}>เลขประจำตัวประชาชน/พาสปอร์ต</label><input type="text" name="missing_id_card_passport" value={formData.missing_id_card_passport || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>หมายเลขหนังสือเดินทาง</label><input type="text" name="passport_number" value={formData.passport_number || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>

      <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">รายละเอียดการสูญหาย</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
         <div><label className={labelClass}>วันที่สูญหาย</label><input type="date" name="missing_date" value={formData.missing_date || ""} onChange={handleInputChange} className={inputClass} /></div>
         <div><label className={labelClass}>เวลาสูญหาย</label><input type="time" name="missing_time" value={formData.missing_time || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>
      <div className="mb-5">
        <label className={labelClass}>สถานที่สูญหาย หรือ จุดที่พบเห็นครั้งสุดท้าย *</label>
        <textarea name="detected_location_details" value={formData.detected_location_details || ""} onChange={handleInputChange} required rows={2} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>จังหวัด</label><AutocompleteInput name="detected_location_province" value={formData.detected_location_province || ""} options={detProvinces} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>เขต/อำเภอ</label><AutocompleteInput name="detected_location_district" value={formData.detected_location_district || ""} options={detDistrictOptions} onChange={handleInputChange} onSelectOption={handleSelectDetDistrict} className={inputClass} /></div>
        <div><label className={labelClass}>แขวง/ตำบล</label><AutocompleteInput name="detected_location_sub_district" value={formData.detected_location_sub_district || ""} options={detSubDistrictOptions} onChange={handleInputChange} onSelectOption={handleSelectDetSubDistrict} className={inputClass} /></div>
      </div>

      <div className="mb-5">
        <label className={labelClass}>พฤติการณ์โดยสังเขป</label>
        <textarea name="incident_summary" value={formData.incident_summary || ""} onChange={handleInputChange} rows={3} className={inputClass} />
      </div>

      <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">ข้อมูลผู้แจ้ง</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
        <div><label className={labelClass}>ชื่อต้นภาษาไทย</label><input type="text" name="informant_first_name_th" value={formData.informant_first_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>ชื่อกลางภาษาไทย</label><input type="text" name="informant_middle_name_th" value={formData.informant_middle_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>นามสกุลภาษาไทย</label><input type="text" name="informant_last_name_th" value={formData.informant_last_name_th || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div><label className={labelClass}>เลขประจำตัวประชาชน (ผู้แจ้ง)</label><input type="text" name="informant_id_card_passport" value={formData.informant_id_card_passport || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>ความสัมพันธ์</label><input type="text" name="relationship" value={formData.relationship || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>เบอร์โทรศัพท์</label><input type="text" name="informant_phone" value={formData.informant_phone || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>อีเมล</label><input type="email" name="informant_email" value={formData.informant_email || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>

      <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">ข้อมูลคดีและการดำเนินการ</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div><label className={labelClass}>วันที่รับแจ้ง</label><input type="date" name="reported_date" value={formData.reported_date || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>สถานีตำรวจ</label><input type="text" name="police_station" value={formData.police_station || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>เลขคดี</label><input type="text" name="case_number" value={formData.case_number || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>เลข ปจว.</label><input type="text" name="pjv_number" value={formData.pjv_number || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>พนักงานสอบสวน</label><input type="text" name="investigating_officer" value={formData.investigating_officer || ""} onChange={handleInputChange} className={inputClass} /></div>
        <div><label className={labelClass}>ผลการปฏิบัติ</label><input type="text" name="operation_result" value={formData.operation_result || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div><label className={labelClass}>วันที่พบตัว (Found Date)</label><input type="date" name="found_date" value={formData.found_date || ""} onChange={handleInputChange} className={inputClass} /></div>
      </div>

      <div className="mb-5">
        <label className={labelClass}>หมายเหตุเพิ่มเติม (Note)</label>
        <textarea name="notes" value={formData.notes || ""} onChange={handleInputChange} rows={3} className={inputClass} />
      </div>

      <div className="flex justify-end gap-3 border-t border-(--wrapper) pt-6 mt-8">
        <button type="button" onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 bg-stone-200 dark:bg-stone-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer"><X size={16} /> ยกเลิก</button>
        <button type="submit" disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer disabled:opacity-50"><Save size={16} /> {isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button>
      </div>
    </form>
  );
}
