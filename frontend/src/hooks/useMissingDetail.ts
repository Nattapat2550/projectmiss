import { useState, useEffect } from "react";
import Swal from "sweetalert2";

export function useMissingDetail(id: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [passportImageFile, setPassportImageFile] = useState<File | null>(null);
  const [passportImagePreview, setPassportImagePreview] = useState<string | null>(null);
  const [pjvFile, setPjvFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/v1/missing/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลได้");
      const json = await res.json();
      
      const personData = json.data;
      if (personData.missing_date) personData.missing_date = String(personData.missing_date).split("T")[0];
      if (personData.reported_date) personData.reported_date = String(personData.reported_date).split("T")[0];
      if (personData.found_date) personData.found_date = String(personData.found_date).split("T")[0];

      setData(personData);
      setFormData(personData);
      setNote(personData.notes || "");
      if (personData.photo_url) setImagePreview(personData.photo_url);
      if (personData.passport_photo_url) setPassportImagePreview(personData.passport_photo_url);

    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev: any) => ({ ...prev, photo_url: null })); // Optionally signal removal to backend if supported
  };

  const handlePassportImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPassportImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPassportImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePassportImageRemove = () => {
    setPassportImageFile(null);
    setPassportImagePreview(null);
    setFormData((prev: any) => ({ ...prev, passport_photo_url: null }));
  };

  const handlePjvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPjvFile(file);
    }
  };

  const handlePjvFileRemove = () => {
    setPjvFile(null);
    setFormData((prev: any) => ({ ...prev, pjv_file_url: null }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];

      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && typeof formData[key] !== 'object') {
          submitData.append(key, String(formData[key]));
        }
      });

      if (imageFile) {
        submitData.append("photo", imageFile);
      }
      if (passportImageFile) {
        submitData.append("passport_photo", passportImageFile);
      }
      if (pjvFile) {
        submitData.append("pjv_file", pjvFile);
      }

      const res = await fetch(`${backendUrl}/api/v1/missing/${id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "บันทึกข้อมูลไม่สำเร็จ");
      }

      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'บันทึกข้อมูลเรียบร้อยแล้ว!', timer: 1500, showConfirmButton: false });
      setIsEditing(false);
      fetchData(); // reload
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    states: { data, loading, isEditing, formData, imagePreview, passportImagePreview, isSaving, note, imageFile, passportImageFile, pjvFile },
    actions: { setIsEditing, setNote, fetchData },
    handlers: { handleInputChange, handleImageChange, handleSave, handleImageRemove, handlePassportImageChange, handlePassportImageRemove, handlePjvFileChange, handlePjvFileRemove }
  };
}
