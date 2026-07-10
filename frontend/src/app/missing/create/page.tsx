"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, X, FileSpreadsheet, Image as ImageIcon } from "lucide-react";
import Swal from 'sweetalert2';
import { useAddressOptions } from "@/hooks/useAddressOptions";
import { useAgenciesOptions } from "@/hooks/useAgenciesOptions";
import AutocompleteInput from "@/components/ui/AutocompleteInput";
import { ALL_NATIONALITIES } from "@/constants/nationalities";

export default function CreateMissingPerson() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeDivisionType, setActiveDivisionType] = useState("division_1");

  const [formData, setFormData] = useState({
    missing_first_name_th: "",
    missing_middle_name_th: "",
    missing_last_name_th: "",
    missing_first_name_en: "",
    missing_middle_name_en: "",
    missing_last_name_en: "",
    date_of_birth: "", 
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
    informant_date_of_birth: "",
    informant_gender: "",
    informant_nationality: "",
    informant_id_card_passport: "",
    informant_phone: "",
    informant_email: "",
    relationship: "",
    human_trafficking_indicators: false, 
    notes: "", 
    entry_channel: "",
    entry_checkpoint_province: "",
    airline: "",
    entry_date: "",
    reported_date: "",
    receiving_channel: "",
    command_center: "",
    division_name: "",
    station: "",
    officer_name: "",
        case_number: "",
    pjv_number: "",
    pjv_file_url: "",
    operation_result: false,
    found_date: "",
    victim_classification: "",
    human_trafficking_type: "",
    action_taken: "",
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedPassportImage, setSelectedPassportImage] = useState<File | null>(null);
  const [selectedPjvFile, setSelectedPjvFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [passportImagePreview, setPassportImagePreview] = useState<string | null>(null);

  const { provinces: detProvinces, districtOptions: detDistrictOptions, subDistrictOptions: detSubDistrictOptions } = useAddressOptions(formData.detected_location_province, formData.detected_location_district);
  const { commandCenterOptions, divisionOptions, stationOptions } = useAgenciesOptions(formData.command_center, formData.division_name, formData.station);

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

  const handleCommandCenterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e);
    handleInputChange({ target: { name: "division_name", value: "", type: "text" } } as any);
    handleInputChange({ target: { name: "station", value: "", type: "text" } } as any);
  };

  const handleDivisionNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e);
    handleInputChange({ target: { name: "station", value: "", type: "text" } } as any);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handlePassportImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPassportImage(file);
      setPassportImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePassportImageRemove = () => {
    setSelectedPassportImage(null);
    setPassportImagePreview(null);
  };

  const handlePjvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPjvFile(file); 
    }
  };

  const handlePjvFileRemove = () => {
    setSelectedPjvFile(null); 
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
      if (selectedPassportImage) {
        submitData.append("passport_photo", selectedPassportImage);
      }
      if (selectedPjvFile) {
        submitData.append("pjv_file", selectedPjvFile);
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

  const inputClass = "w-full border px-3 py-1.5 text-sm rounded-sm bg-background !text-black dark:!text-white border-(--wrapper) focus:outline-none transition-all dark:[color-scheme:dark]";
  const labelClass = "block text-xs font-semibold mb-1.5 !text-black dark:!text-white opacity-80";

  return (
    <div className="min-h-screen bg-background p-6 text-foreground transition-colors duration-200">
      <div className="max-w-2xl mx-auto mb-6">
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

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-(--container) rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 p-6 sm:p-8 mb-12">
        
        {error && <div className="mb-6 rounded-md border border-red-500 bg-red-100 dark:bg-red-900/30 p-4 text-sm text-red-600 dark:text-red-400 font-medium">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6 p-6 rounded-xl">
          <div>
            <h3 className="text-lg font-bold mb-4 !text-black dark:!text-white">รูปภาพบุคคลสูญหาย</h3>
            <div className="flex flex-col items-start gap-4">
            <img 
              src={imagePreview || "/return.png"} 
              alt="Preview" 
              referrerPolicy="no-referrer" 
              onError={(e) => { e.currentTarget.src = "/return.png"; }}
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
          <div>
            <h3 className="text-lg font-bold mb-4 !text-black dark:!text-white">รูปถ่ายหนังสือเดินทาง (ถ้ามี)</h3>
            <div className="flex flex-col items-start gap-4">
            <img 
              src={passportImagePreview || "/passport.png"} 
              alt="Passport Preview" 
              referrerPolicy="no-referrer" 
              onError={(e) => { e.currentTarget.src = "/passport.png"; }}
              className="h-40 w-40 object-cover rounded-xl shadow-sm bg-white border border-gray-200 p-1" 
            />
            <div className="flex gap-3">
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md cursor-pointer hover:opacity-90 text-sm">
                <ImageIcon size={16} /> {passportImagePreview ? "แก้ไขรูปภาพ" : "อัปโหลดรูปภาพ"}
                <input type="file" accept="image/*" onChange={handlePassportImageChange} className="hidden" />
              </label>
              {passportImagePreview && (
                <button type="button" onClick={handlePassportImageRemove} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer">
                  <X size={16} /> ลบรูปภาพ
                </button>
              )}
            </div>
          </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลบุคคลสูญหาย</h3>
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
          <div><label className={labelClass}>วันเกิด (แปลงจากอายุอัตโนมัติ)</label><input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleInputChange} className={inputClass} /></div>
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

        <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลการเดินทางเข้า (ถ้ามี)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div><label className={labelClass}>ช่องทางที่เดินทางเข้า</label><input type="text" name="entry_channel" value={formData.entry_channel} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ชื่อด่านและจังหวัดที่เดินทางเข้า</label><input type="text" name="entry_checkpoint_province" value={formData.entry_checkpoint_province} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>สายการบิน (ถ้ามี)</label><input type="text" name="airline" value={formData.airline} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>วันที่เดินทางเข้า</label><input type="date" name="entry_date" value={formData.entry_date} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">รายละเอียดการสูญหาย</h3>
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

        <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลการรับแจ้ง</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>ชื่อต้น (ไทย) (ผู้แจ้ง)</label><input type="text" name="informant_first_name_th" value={formData.informant_first_name_th} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ชื่อกลาง (ไทย) (ผู้แจ้ง)</label><input type="text" name="informant_middle_name_th" value={formData.informant_middle_name_th} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>นามสกุล (ไทย) (ผู้แจ้ง)</label><input type="text" name="informant_last_name_th" value={formData.informant_last_name_th} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>ชื่อต้น (อังกฤษ) (ผู้แจ้ง)</label><input type="text" name="informant_first_name_en" value={formData.informant_first_name_en} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ชื่อกลาง (อังกฤษ) (ผู้แจ้ง)</label><input type="text" name="informant_middle_name_en" value={formData.informant_middle_name_en} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>นามสกุล (อังกฤษ) (ผู้แจ้ง)</label><input type="text" name="informant_last_name_en" value={formData.informant_last_name_en} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>วันเกิด (ผู้แจ้ง)</label><input type="date" name="informant_date_of_birth" value={formData.informant_date_of_birth} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เพศ (ผู้แจ้ง)</label>
            <select name="informant_gender" value={formData.informant_gender} onChange={handleInputChange} className={inputClass}>
              <option value="">ไม่ระบุ</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option>
            </select>
          </div>
          <div><label className={labelClass}>สัญชาติ (ผู้แจ้ง)</label><AutocompleteInput name="informant_nationality" value={formData.informant_nationality} options={ALL_NATIONALITIES} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div><label className={labelClass}>เลขประจำตัวประชาชน (ผู้แจ้ง)</label><input type="text" name="informant_id_card_passport" value={formData.informant_id_card_passport} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ความสัมพันธ์</label><input type="text" name="relationship" value={formData.relationship} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เบอร์โทรศัพท์ (ผู้แจ้ง)</label><input type="text" name="informant_phone" value={formData.informant_phone} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>อีเมล (ผู้แจ้ง)</label><input type="email" name="informant_email" value={formData.informant_email} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        
        <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">สถานีตำรวจที่รับแจ้ง</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>บช.</label><AutocompleteInput name="command_center" value={formData.command_center} options={commandCenterOptions} onChange={handleCommandCenterChange} className={inputClass} /></div>
          
          <div className="flex flex-col lg:flex-row gap-2 col-span-1">
            <div className="w-full">
              <label className={labelClass}>ชื่อ บก.</label>
              <AutocompleteInput name="division_name" value={formData.division_name} options={divisionOptions} onChange={handleDivisionNameChange} className={inputClass} placeholder="ไม่ระบุ" />
            </div>
          </div>

          <div><label className={labelClass}>สน./สภ.</label><AutocompleteInput name="station" value={formData.station} options={stationOptions} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="col-span-1 md:col-span-2"><label className={labelClass}>ชื่อพนักงานสอบสวน/ตำรวจ (ไม่ต้องมียศ)</label><input type="text" name="officer_name" value={formData.officer_name} onChange={handleInputChange} className={inputClass} /></div>
                  </div>

        <h3 className="text-xl font-bold text-(--header) mb-4 mt-8">ข้อมูลคดีและการดำเนินการ</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div><label className={labelClass}>วันที่รับแจ้งความ</label><input type="date" name="reported_date" value={formData.reported_date} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ช่องทางการรับแจ้ง</label><input type="text" name="receiving_channel" value={formData.receiving_channel} onChange={handleInputChange} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>เลขคดี</label><input type="text" name="case_number" value={formData.case_number} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>เลข ปจว.</label><input type="text" name="pjv_number" value={formData.pjv_number} onChange={handleInputChange} className={inputClass} /></div>
          <div className="col-span-1 md:col-span-2">
            <label className={labelClass}>ไฟล์ ปจว. (PDF หรือรูปภาพ)</label>
            <div className="flex items-center gap-3">
              {selectedPjvFile ? (
                <div className="flex items-center gap-2 text-sm px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                  <span className="truncate max-w-[200px]">{selectedPjvFile.name}</span>
                  <button type="button" onClick={handlePjvFileRemove} className="text-red-500 hover:text-red-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md cursor-pointer hover:opacity-90 w-fit text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> อัปโหลดไฟล์ ปจว.
                  <input type="file" accept=".pdf,image/*" onChange={handlePjvFileChange} className="hidden" />
                </label>
              )}
              {formData.pjv_file_url && (
                <a href={formData.pjv_file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-sm hover:underline flex items-center gap-1">
                  ดูไฟล์เดิม
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>
              )}
            </div>
            {!selectedPjvFile && !formData.pjv_file_url && (
              <input type="text" name="pjv_file_url" value={formData.pjv_file_url} onChange={handleInputChange} className={`${inputClass} mt-2`} placeholder="หรือวางลิงก์ไฟล์ ปจว. ที่นี่" />
            )}
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 bg-background p-4 rounded-xl border border-(--wrapper)">
          <input type="checkbox" id="operation_result" name="operation_result" checked={formData.operation_result} onChange={handleInputChange} className="w-4 h-4 cursor-pointer" />
          <label htmlFor="operation_result" className="text-sm font-bold cursor-pointer !text-black dark:!text-white">พบตัวแล้ว (ผลการปฏิบัติ)</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div><label className={labelClass}>วันที่พบตัว</label><input type="date" name="found_date" value={formData.found_date} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <div className="mb-5 flex items-center gap-2 bg-background p-4 rounded-xl border border-(--wrapper)">
          <input type="checkbox" id="human_trafficking_indicators" name="human_trafficking_indicators" checked={formData.human_trafficking_indicators} onChange={handleInputChange} className="w-4 h-4 cursor-pointer" />
          <label htmlFor="human_trafficking_indicators" className="text-sm font-bold cursor-pointer !text-black dark:!text-white">มีข้อบ่งชี้การค้ามนุษย์ (Human Trafficking Indicator)</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div><label className={labelClass}>การคัดแยกเหยื่อ</label><input type="text" name="victim_classification" value={formData.victim_classification} onChange={handleInputChange} className={inputClass} /></div>
          <div><label className={labelClass}>ประเภทของการค้ามนุษย์</label><input type="text" name="human_trafficking_type" value={formData.human_trafficking_type} onChange={handleInputChange} className={inputClass} /></div>
        </div>

        <div className="mb-5">
          <label className={labelClass}>การดำเนินการ (Action Taken)</label>
          <textarea name="action_taken" value={formData.action_taken} onChange={handleInputChange} rows={3} className={inputClass} />
        </div>

        <div className="mb-5">
          <label className={labelClass}>หมายเหตุ (Notes)</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2} className={inputClass} />
        </div>

        <div className="flex justify-end gap-3 border-t border-(--wrapper) pt-6 mt-8">
          <Link href="/missing">
            <button type="button" className="flex items-center gap-1.5 px-4 py-2 bg-stone-200 dark:bg-stone-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition text-sm cursor-pointer">
              <X size={16} /> ยกเลิก
            </button>
          </Link>
          <button type="submit" disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-(--header) text-background font-bold rounded-lg hover:opacity-90 transition text-sm cursor-pointer disabled:opacity-50">
            <Save size={16} /> {loading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>
      </form>
    </div>
  );
}