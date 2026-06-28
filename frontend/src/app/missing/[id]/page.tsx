"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, User, MapPin, Calendar, Phone, Mail, Shield, FileText, Building2, AlertTriangle } from "lucide-react";

interface MissingPersonDetail {
  // missing_persons
  missing_person_id: string;
  missing_person_name: string;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  passport_number: string | null;
  missing_id_card_passport: string | null;
  // cases
  case_id: string | null;
  missing_date: string | null;
  missing_time: string | null;
  missing_location: string | null;
  last_seen_location_province: string | null;
  photo_url: string | null;
  found_date: string | null;
  reported_date: string | null;
  case_number: string | null;
  operation_result: string | null;
  police_station: string | null;
  incident_summary: string | null;
  notes: string | null;
  human_trafficking_indicators: string | null;
  victim_classification: string | null;
  human_trafficking_type: string | null;
  action_taken: string | null;
  entry_channel: string | null;
  entry_checkpoint_province: string | null;
  airline: string | null;
  entry_date: string | null;
  last_seen_date: string | null;
  pjv_number: string | null;
  investigating_officer: string | null;
  receiving_channel: string | null;
  relationship: string | null;
  // informants
  informant_name: string | null;
  informant_phone: string | null;
  informant_email: string | null;
  informant_id_card_passport: string | null;
  informant_contact_channel: string | null;
  // agencies
  command_center: string | null;
  station: string | null;
  receiving_officer: string | null;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "ไม่ระบุ";
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function InfoRow({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  const display = value && value.trim() ? value : "ไม่ระบุ";
  return (
    <div className="flex flex-col gap-1 py-3 border-b border-(--wrapper) last:border-b-0">
      <dt className="text-xs font-bold text-(--header) opacity-60 flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-sm text-foreground whitespace-pre-wrap break-words">{display}</dd>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-(--container) border border-(--wrapper) rounded-xl p-5 md:p-6 shadow-sm">
      <h3 className="text-lg font-bold text-(--header) mb-4 pb-3 border-b border-(--wrapper) flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">{children}</dl>
    </div>
  );
}

export default function MissingPersonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<MissingPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
        const res = await fetch(`${backendUrl}/api/v1/missing/${id}`, { cache: "no-store" });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "ไม่สามารถโหลดข้อมูลได้");
        }
        const json = await res.json();
        setData(json.data);
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-(--wrapper)">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-(--wrapper) border-t-(--header) mb-4"></div>
        <span className="text-sm font-medium opacity-70">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-(--wrapper) p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push("/missing")} className="flex items-center gap-1 text-xl font-bold text-(--header) hover:opacity-80 transition cursor-pointer mb-6">
            <ChevronLeft size={28} />
            <span>กลับไปรายการ</span>
          </button>
          <div className="bg-(--container) border border-red-300 dark:border-red-800 rounded-xl p-8 text-center">
            <p className="text-red-500 font-medium">{error || "ไม่พบข้อมูล"}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusColor = data.found_date ? "bg-(--greenBG) text-(--greenText) border-(--greenBorder)" : "bg-(--redBG) text-(--redText) border-(--redBorder)";
  const statusText = data.found_date ? `พบตัวแล้ว (${formatDate(data.found_date)})` : "ยังไม่พบตัว";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-(--wrapper) p-4 sm:p-6 text-foreground">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push("/missing")} className="flex items-center gap-1 text-xl font-bold text-(--header) hover:opacity-80 transition cursor-pointer">
            <ChevronLeft size={28} />
            <span>ข้อมูลบุคคลสูญหาย</span>
          </button>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${statusColor}`}>{statusText}</span>
        </div>

        {/* Top card: Photo + basic info */}
        <div className="bg-(--container) border border-(--wrapper) rounded-xl p-5 md:p-6 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Photo */}
            <div className="shrink-0 flex justify-center">
              <div className="size-40 rounded-xl border border-(--wrapper) overflow-hidden bg-background shadow-sm">
                <Image
                  src={data.photo_url || "/user.png"}
                  alt={data.missing_person_name || "รูปภาพ"}
                  width={160}
                  height={160}
                  className="size-40 object-cover"
                  unoptimized={!!data.photo_url}
                />
              </div>
            </div>
            {/* Basic Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-(--header) mb-1">{data.missing_person_name || "ไม่ระบุชื่อ"}</h2>
              <div className="flex flex-wrap gap-3 text-sm opacity-70 mb-4">
                {data.age && <span>{data.age} ปี</span>}
                {data.gender && <span>• {data.gender}</span>}
                {data.nationality && <span>• สัญชาติ {data.nationality}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <InfoRow label="เลขประจำตัว/พาสปอร์ต" value={data.missing_id_card_passport || data.passport_number} />
                <InfoRow label="หมายเลขหนังสือเดินทาง" value={data.passport_number} />
                <InfoRow label="เลขคดี" value={data.case_number} />
                <InfoRow label="เลข ปจว." value={data.pjv_number} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Missing Details */}
          <Section title="รายละเอียดการสูญหาย" icon={<MapPin size={18} />}>
            <InfoRow label="วันที่สูญหาย" value={formatDate(data.missing_date)} icon={<Calendar size={12} />} />
            <InfoRow label="เวลาที่สูญหาย" value={data.missing_time} />
            <InfoRow label="สถานที่สูญหาย" value={data.missing_location} />
            <InfoRow label="จังหวัด/จุดสุดท้ายที่พบ" value={data.last_seen_location_province} />
            <InfoRow label="วันที่พบเห็นครั้งสุดท้าย" value={formatDate(data.last_seen_date)} />
            <InfoRow label="ผลการปฏิบัติ" value={data.operation_result} />
          </Section>

          {/* Reporting Info */}
          <Section title="ข้อมูลการรับแจ้ง" icon={<FileText size={18} />}>
            <InfoRow label="วันที่รับแจ้ง" value={formatDate(data.reported_date)} icon={<Calendar size={12} />} />
            <InfoRow label="ช่องทางการรับแจ้ง" value={data.receiving_channel} />
            <InfoRow label="สถานีตำรวจ" value={data.police_station} icon={<Shield size={12} />} />
            <InfoRow label="เจ้าหน้าที่รับแจ้ง" value={data.receiving_officer} />
            <InfoRow label="พนักงานสอบสวน" value={data.investigating_officer} />
            <InfoRow label="กองบัญชาการ" value={data.command_center} icon={<Building2 size={12} />} />
          </Section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Informant */}
          <Section title="ข้อมูลผู้แจ้ง" icon={<User size={18} />}>
            <InfoRow label="ชื่อ-สกุล ผู้แจ้ง" value={data.informant_name} />
            <InfoRow label="ความสัมพันธ์" value={data.relationship} />
            <InfoRow label="เลขประจำตัวผู้แจ้ง" value={data.informant_id_card_passport} />
            <InfoRow label="เบอร์โทรศัพท์" value={data.informant_phone} icon={<Phone size={12} />} />
            <InfoRow label="อีเมล" value={data.informant_email} icon={<Mail size={12} />} />
            <InfoRow label="ช่องทางติดต่อ" value={data.informant_contact_channel} />
          </Section>

          {/* Travel Info */}
          <Section title="ข้อมูลการเดินทาง" icon={<MapPin size={18} />}>
            <InfoRow label="ช่องทางเดินทางเข้า" value={data.entry_channel} />
            <InfoRow label="ด่าน/จังหวัดที่เข้า" value={data.entry_checkpoint_province} />
            <InfoRow label="สายการบิน" value={data.airline} />
            <InfoRow label="วันที่เดินทางเข้า" value={formatDate(data.entry_date)} icon={<Calendar size={12} />} />
          </Section>
        </div>

        {/* Incident Summary - full width */}
        {data.incident_summary && (
          <div className="bg-(--container) border border-(--wrapper) rounded-xl p-5 md:p-6 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-(--header) mb-4 pb-3 border-b border-(--wrapper) flex items-center gap-2">
              <FileText size={18} />
              พฤติการณ์โดยสังเขป
            </h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.incident_summary}</p>
          </div>
        )}

        {/* Human Trafficking */}
        {(data.human_trafficking_indicators || data.victim_classification || data.human_trafficking_type) && (
          <div className="bg-(--container) border border-(--wrapper) rounded-xl p-5 md:p-6 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-(--header) mb-4 pb-3 border-b border-(--wrapper) flex items-center gap-2">
              <AlertTriangle size={18} />
              ข้อมูลการค้ามนุษย์
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <InfoRow label="ข้อบ่งชี้ค้ามนุษย์" value={data.human_trafficking_indicators} />
              <InfoRow label="การคัดแยกเหยื่อ" value={data.victim_classification} />
              <InfoRow label="ประเภทของการค้ามนุษย์" value={data.human_trafficking_type} />
              <InfoRow label="การดำเนินการ" value={data.action_taken} />
            </dl>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div className="bg-(--container) border border-(--wrapper) rounded-xl p-5 md:p-6 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-(--header) mb-4 pb-3 border-b border-(--wrapper)">หมายเหตุ</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{data.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
