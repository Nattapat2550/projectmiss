import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';
export const getValidImageUrl = (url: string | null) => {
  if (!url) return null;
  if (url.startsWith("blob:")) return url;
  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  } else if (url.includes("id=")) {
    const match = url.match(/id=([^&]+)/);
    if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  }
  if (url.startsWith("/")) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    return `${backendUrl}${url}`;
  }
  return url;
};

export function useImmigrantDetail(id: string) {
  const router = useRouter();
  const [person, setPerson] = useState<any | null>(null);
  const [personType, setPersonType] = useState<"repatriated" | "illegal" | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const getToken = () => {
    return document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
  };

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const token = getToken();
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res = await fetch(`${backendUrl}/api/v1/immigrants/repatriated/${id}`, { headers });
      let json = await res.json().catch(() => ({}));
      
      // ตอนนี้ Backend จะส่ง 200 {success: false} กลับมาแทน 404
      if (res.ok && json.success && json.data) {
        setPerson(json.data); setPersonType("repatriated"); setNote(json.data.note || "");
        setFormData({ ...json.data, date_of_birth: json.data.date_of_birth?.split("T")[0] || "", return_date: json.data.return_date?.split("T")[0] || "" });
        setImagePreview(getValidImageUrl(json.data.photo_url)); return;
      }

      res = await fetch(`${backendUrl}/api/v1/immigrants/illegal/${id}`, { headers });
      json = await res.json().catch(() => ({}));
      
      if (res.ok && json.success && json.data) {
        setPerson(json.data); setPersonType("illegal"); setNote(json.data.note || "");
        setFormData({ ...json.data, detected_date: json.data.detected_date?.split("T")[0] || "" });
        setImagePreview(getValidImageUrl(json.data.photo_url)); return;
      }
      
      setPerson(null); setPersonType(null);
    } catch (error) {
      console.error(error); setPerson(null); setPersonType(null);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleInputChange = (e: any) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleCheckboxChange = (e: any) => setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.checked }));
  const handleImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
      const endpoint = personType === "repatriated" ? `repatriated/${id}` : `illegal/${id}`;
      const payload = { ...formData };
      
      if (personType === "repatriated") {
        payload.number_of_case = parseInt(payload.number_of_case) || 0;
        payload.number_of_warrant = parseInt(payload.number_of_warrant) || 0;
        payload.age = parseInt(payload.age) || null;
      }
      
      const submitData = new FormData();
      Object.keys(payload).forEach(key => { 
        if (payload[key] !== null && payload[key] !== undefined) {
           submitData.append(key, String(payload[key])); 
        }
      });
      if (selectedImage) submitData.append("photo", selectedImage);

      const token = getToken();
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${backendUrl}/api/v1/immigrants/${endpoint}`, { 
        method: "PUT", 
        headers,
        body: submitData 
      });
      
      if (!res.ok) {
         const errData = await res.json().catch(() => ({}));
         throw new Error(errData.message || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล");
      }
      
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว!',
        timer: 1500,
        showConfirmButton: false
      });
      setIsEditing(false); setSelectedImage(null); fetchData(); 
    } catch (error: any) { 
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message
      });
    } finally { 
      setIsSaving(false); 
    }
  };

  return { 
    states: { person, personType, loading, note, isEditing, formData, isSaving, imagePreview }, 
    actions: { setNote, setIsEditing },
    handlers: { handleInputChange, handleCheckboxChange, handleImageChange, handleSave }
  };
}