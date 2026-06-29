"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, X, FileSpreadsheet } from "lucide-react";
import Swal from 'sweetalert2';
import SingleImageField from "@/components/form/single-image-field";
import { useAddressOptions } from "@/hooks/useAddressOptions";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import { ALL_NATIONALITIES } from "@/constants/nationalities";

export default function CreateMissingPerson() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    missing_first_name_th: "",
    missing_middle_name_th: "",
    missing_last_name_th: "",
    missing_first_name_en: "",
    missing_middle_name_en: "",
    missing_last_name_en: "",
    age: "", 
    gender: "",
    nationality: "", 
    passport_number: "", 
    missing_id_card_passport: "",
    missing_date: "", 
    missing_time: "", 
    detected_location_details: "",
    detected_location_sub_district: "", 
    detected_location_district: "", 
    detected_location_province: "", 
    incident_summary: "", 
    informant_first_name_th: "",
    informant_middle_name_th: "",
    informant_last_name_th: "",
    informant_first_name_en: "",
    informant_middle_name_en: "",
    informant_last_name_en: "",
    informant_age: "",
    informant_gender: "",
    informant_nationality: "",
    informant_id_card_passport: "",
    informant_phone: "",
    informant_email: "",
    relationship: "",
    police_station: "", 
    human_trafficking_indicators: false, 
    notes: "", 
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const { provinces: detProvinces, districtOptions: detDistrictOptions, subDistrictOptions: detSubDistrictOptions } = useAddressOptions(formData.detected_location_province, formData.detected_location_district);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file); 
    }
  };

  const handleImageRemove = () => {
    setSelectedImage(null); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        const val = (formData as any)[key];
        if (val !== null && val !== undefined && val !== "") {
          submitData.append(key, String(val));
        }
      });

      if (selectedImage) {
        submitData.append("photo", selectedImage);
      }

      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const res = await fetch(`${backendUrl}/api/v1/missing`, {
        method: "POST", 
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: submitData, 
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'เพิ่มข้อมูลบุคคลสูญหายสำเร็จ!',
        timer: 1500,
        showConfirmButton: false
      });
      router.push("/missing"); 
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-background border border-(--wrapper) text-foreground rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--header)/40";
  const labelClass = "block text-xs font-bold mb-2 text-(--header) opacity-70";

  return (
    <div className="min-h-screen bg-background p-6 text-foreground transition-colors duration-200">
      <div className="max-w-4xl mx-auto mb-6">
        <button onClick={() => router.push("/missing")} className="flex items-center gap-1 text-2xl font-bold text-(--header) hover:opacity-80 transition cursor-pointer">
          <ChevronLeft size={32} />
          <span>เพิ่มข้อมูลใหม่ (บุคคลสูญหาย)</span>
        </button>
        <Link href="/missing-upload">
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/50 rounded-lg hover:bg-emerald-500/20 font-bold transition text-sm cursor-pointer mt-4">
            <FileSpreadsheet size={18} /> อัพโหลดจากไฟล์ Excel
          </button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto bg-(--container) border border-(--wrapper) rounded-2xl p-6 md:p-8 shadow-sm transition-colors mb-12">
        
        {error && <div className="mb-6 rounded-md border border-red-500 bg-red-100 dark:bg-red-900/30 p-4 text-sm text-red-600 dark:text-red-400 font-medium">{error}</div>}

        <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3">รูปภาพบุคคลสูญหาย</h3>
        <div className="mb-6 flex flex-col items-start gap-4">
          <SingleImageField file={selectedImage} previewUrl="/user.png" onChange={handleImageChange} onRemove={handleImageRemove}/>
        </div>

        <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">ข้อมูลบุคคลสูญหาย</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>ชื่อต้น (ไทย) *</label><input required type="text" name="missing_first_name_th" value={formData.missing_first_name_th} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ชื่อกลาง (ไทย)</label><input type="text" name="missing_middle_name_th" value={formData.missing_middle_name_th} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>นามสกุล (ไทย) *</label><input required type="text" name="missing_last_name_th" value={formData.missing_last_name_th} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>ชื่อต้น (อังกฤษ)</label><input type="text" name="missing_first_name_en" value={formData.missing_first_name_en} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ชื่อกลาง (อังกฤษ)</label><input type="text" name="missing_middle_name_en" value={formData.missing_middle_name_en} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>นามสกุล (อังกฤษ)</label><input type="text" name="missing_last_name_en" value={formData.missing_last_name_en} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>อายุ (ปี)</label><input type="number" name="age" value={formData.age} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เพศ</label>
            <select name="gender" value={formData.gender} onChange={handleInputChange} className={inputClass}>
              <option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
            </select>
          </div>
          <div><label className={labelClass}>สัญชาติ (Nationality)</label><AutocompleteInput name="nationality" value={formData.nationality} options={ALL_NATIONALITIES} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div><label className={labelClass}>เลขประจำตัวประชาชน/พาสปอร์ต</label><input type="text" name="missing_id_card_passport" value={formData.missing_id_card_passport} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>หมายเลขหนังสือเดินทาง (ถ้ามี)</label><input type="text" name="passport_number" value={formData.passport_number} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">รายละเอียดการสูญหาย</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div><label className={labelClass}>วันที่สูญหาย</label><input type="date" name="missing_date" value={formData.missing_date} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เวลาที่คาดว่าสูญหาย</label><input type="time" name="missing_time" value={formData.missing_time} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <div className="mb-5">
          <label className={labelClass}>สถานที่พบเห็นครั้งสุดท้าย (รายละเอียด) *</label>
          <textarea required name="detected_location_details" value={formData.detected_location_details} onChange={handleInputChange} rows={2} className={inputClass} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>จังหวัด</label><AutocompleteInput name="detected_location_province" value={formData.detected_location_province} options={detProvinces} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เขต/อำเภอ</label><AutocompleteInput name="detected_location_district" value={formData.detected_location_district} options={detDistrictOptions} onChange={handleInputChange} onSelectOption={handleSelectDetDistrict} className={inputClass} /></div>
          <div><label className={labelClass}>แขวง/ตำบล</label><AutocompleteInput name="detected_location_sub_district" value={formData.detected_location_sub_district} options={detSubDistrictOptions} onChange={handleInputChange} onSelectOption={handleSelectDetSubDistrict} className={inputClass} /></div>
        </div>

        <div className="mb-5">
          <label className={labelClass}>พฤติการณ์โดยสังเขป (Incident Summary)</label>
          <textarea name="incident_summary" value={formData.incident_summary} onChange={handleInputChange} rows={3} className={inputClass} />
        </div>

        <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">ข้อมูลการรับแจ้ง</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>ชื่อต้น (ผู้แจ้ง)</label><input type="text" name="informant_first_name_th" value={formData.informant_first_name_th} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ชื่อกลาง (ผู้แจ้ง)</label><input type="text" name="informant_middle_name_th" value={formData.informant_middle_name_th} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>นามสกุล (ผู้แจ้ง)</label><input type="text" name="informant_last_name_th" value={formData.informant_last_name_th} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>อายุ (ปี)</label><input type="number" name="informant_age" value={formData.informant_age} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เพศ</label>
            <select name="informant_gender" value={formData.informant_gender} onChange={handleInputChange} className={inputClass}>
              <option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
            </select>
          </div>
          <div><label className={labelClass}>สัญชาติ</label><AutocompleteInput name="informant_nationality" value={formData.informant_nationality} options={ALL_NATIONALITIES} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div><label className={labelClass}>เลขประจำตัวประชาชน (ผู้แจ้ง)</label><input type="text" name="informant_id_card_passport" value={formData.informant_id_card_passport} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ความสัมพันธ์</label><input type="text" name="relationship" value={formData.relationship} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เบอร์โทรศัพท์ (ผู้แจ้ง)</label><input type="text" name="informant_phone" value={formData.informant_phone} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>อีเมล (ผู้แจ้ง)</label><input type="email" name="informant_email" value={formData.informant_email} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        
        <h3 className="text-xl font-bold text-(--header) mb-6 border-b border-(--wrapper) pb-3 mt-8">สถานีตำรวจ</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-5 mb-5">
          <div><label className={labelClass}>สถานีตำรวจที่รับแจ้ง</label><input type="text" name="police_station" value={formData.police_station} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <div className="mb-5 flex items-center gap-2 bg-background p-4 rounded-xl border border-(--wrapper)">
          <input type="checkbox" id="human_trafficking_indicators" name="human_trafficking_indicators" checked={formData.human_trafficking_indicators} onChange={handleInputChange} className="w-4 h-4 text-black! dark:text-white! focus:ring-(--header) border-gray-300 rounded cursor-pointer" />
          <label htmlFor="human_trafficking_indicators" className="text-sm font-bold cursor-pointer select-none text-black! dark:text-white!">มีข้อบ่งชี้การค้ามนุษย์ (Human Trafficking Indicator)</label>
        </div>

        <div className="mb-5">
          <label className={labelClass}>หมายเหตุ (Notes)</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2} className={inputClass} />
        </div>

        <div className="flex justify-end gap-3 border-t border-(--wrapper) pt-6 mt-8">
          <Link href="/missing">
            <button type="button" className="flex items-center gap-1.5 px-4 py-2 bg-stone-200 dark:bg-stone-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition text-sm cursor-pointer">
              <X size={16} /><span>ยกเลิก</span>
            </button>
          </Link>
          <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <Save size={16} /><span>{loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}