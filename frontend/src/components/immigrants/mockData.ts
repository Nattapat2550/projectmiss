// src/components/immigrants/mockData.ts

export interface RepatriatedPerson {
  id: string;
  first_name_th: string;
  middle_name_th?: string;
  last_name_th: string;
  first_name_en?: string;
  middle_name_en?: string;
  last_name_en?: string;
  date_of_birth: string;
  national_id: string;
  passport_id?: string;
  number_of_case: number;
  number_of_warrant: number;
  address: string;
  age?: number;
  return_date?: string;
  channel?: string;
  result: "SUCCESS" | "FAILED" | "PENDING";
}

// 💡 เพิ่มฟิลด์เดิม (address, national_id, date_of_birth) เป็น Optional 
// เพื่อให้ UI เก่าดึงไปใช้แล้วไม่เกิดข้อผิดพลาดทาง Type (Backward Compatibility)
export interface IllegalImmigrant {
  id: string;
  first_name_th: string;
  middle_name_th?: string;
  last_name_th: string;
  first_name_en?: string;
  middle_name_en?: string;
  last_name_en?: string;
  nationality?: string;
  nationality_code?: string; // สำหรับธงชาติ เช่น "MM", "KH"
  passport_id?: string;
  detected_location: string;
  is_victim?: boolean;
  gender?: string;
  detected_date?: string;
  workplace?: string;
  screening_details?: string;

  // ── ฟิลด์จำลองเพิ่มเติมเพื่อรองรับโค้ดเก่า ──
  address?: string;         // ล้อตาม detected_location
  national_id?: string;     // ตัวเลขสมมุติของฝั่งลอบเข้า
  date_of_birth?: string;   // วันเกิดสมมุติ
}

// ─────────────────────────────────────────────
//  Nationality → ISO code mapping
// ─────────────────────────────────────────────
export const NATIONALITY_TO_CODE: Record<string, string> = {
  เมียนมา: "MM",
  พม่า: "MM",
  กัมพูชา: "KH",
  เขมร: "KH",
  ลาว: "LA",
  เวียดนาม: "VN",
  จีน: "CN",
  ไทย: "TH",
  มาเลเซีย: "MY",
  อินโดนีเซีย: "ID",
  ฟิลิปปินส์: "PH",
  อินเดีย: "IN",
  บังกลาเทศ: "BD",
  ปากีสถาน: "PK",
};

/** รับชื่อสัญชาติภาษาไทย คืน ISO code หรือ undefined */
export function getNationalityCode(nationality?: string): string | undefined {
  if (!nationality) return undefined;
  return NATIONALITY_TO_CODE[nationality.trim()];
}

// ─────────────────────────────────────────────
// Mock Data สำหรับฝั่ง ส่งกลับ (Repatriated)
// ─────────────────────────────────────────────
export const MOCK_DEPORTED_DATA: RepatriatedPerson[] = [
  {
    id: "-1",
    first_name_th: "สมชาย",
    middle_name_th: "เรืองโรจน์",
    last_name_th: "ใจดี",
    first_name_en: "Somchai",
    middle_name_en: "Ruangroj",
    last_name_en: "Jaidee",
    date_of_birth: "15/03/2545",
    national_id: "1100600123456",
    passport_id: "AA1234567",
    number_of_case: 2,
    number_of_warrant: 1,
    address: "123/4 ถ.พหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพมหานคร 10900",
    age: 25,
    return_date: "2024-11-30",
    channel: "ด่านพรมแดนแม่สาย",
    result: "SUCCESS",
  },
  { id: "mock-dep-1", first_name_th: "สมชาย", last_name_th: "ดีเลิศ", date_of_birth: "12/05/2535", national_id: "1100200011111", passport_id: "PP0000001", address: "กรุงเทพมหานคร", number_of_case: 1, number_of_warrant: 0, result: "SUCCESS" },
  { id: "mock-dep-2", first_name_th: "วิภา", last_name_th: "สมบูรณ์", date_of_birth: "24/08/2540", national_id: "1100200022222", passport_id: "PP0000002", address: "เชียงใหม่", number_of_case: 1, number_of_warrant: 0, result: "SUCCESS" },
  { id: "mock-dep-3", first_name_th: "มานะ", last_name_th: "กล้าหาญ", date_of_birth: "03/01/2530", national_id: "1100200033333", passport_id: "PP0000003", address: "ภูเก็ต", number_of_case: 1, number_of_warrant: 0, result: "SUCCESS" },
  { id: "mock-dep-4", first_name_th: "อนงค์", last_name_th: "งดงาม", date_of_birth: "15/11/2543", national_id: "1100200044444", passport_id: "PP0000004", address: "ชลบุรี", number_of_case: 1, number_of_warrant: 0, result: "SUCCESS" },
  { id: "mock-dep-5", first_name_th: "สมศักดิ์", last_name_th: "รักชาติ", date_of_birth: "30/07/2538", national_id: "1100200055555", passport_id: "PP0000005", address: "ขอนแก่น", number_of_case: 1, number_of_warrant: 0, result: "SUCCESS" },
];

// ─────────────────────────────────────────────
// Mock Data สำหรับฝั่ง ลอบเข้า (Illegal) - รวมมิตรข้อมูลจากทั้ง 2 เวอร์ชัน
// ─────────────────────────────────────────────
export const MOCK_ILLEGAL_DATA: IllegalImmigrant[] = [
  {
    id: "-2",
    first_name_th: "มิน",
    middle_name_th: "อ่อง",
    last_name_th: "ทุน",
    first_name_en: "Min",
    middle_name_en: "Aung",
    last_name_en: "Thun",
    nationality: "เมียนมา",
    nationality_code: "MM",
    passport_id: "MA-9988776",
    detected_location: "บ้านห้วยผา อ.แม่สาย จ.เชียงราย",
    is_victim: false,
    gender: "ชาย",
    detected_date: "2024-09-14",
    workplace: "ไร่อ้อย ต.เวียงพางคำ",
    screening_details: "ไม่เป็นผู้เสียหาย ลักลอบเข้าเพื่อทำงาน",
    // ใส่ข้อมูลจำลองสำหรับโค้ดเก่าด้วย
    address: "บ้านห้วยผา อ.แม่สาย จ.เชียงราย",
    national_id: "0-8401-XXXXX-00-0",
    date_of_birth: "01/01/2535"
  },
  { 
    id: "mock-ill-1", first_name_th: "หม่อง", last_name_th: "วิน", nationality: "เมียนมา", nationality_code: "MM", gender: "ชาย",
    detected_location: "ตาก (ตรวจพบที่ชายแดน)", 
    address: "ตาก (ตรวจพบที่ชายแดน)", national_id: "0-8401-XXXXX-11-0", date_of_birth: "01/02/2542", passport_id: "PP-ILL01" 
  },
  { 
    id: "mock-ill-2", first_name_th: "ซู", last_name_th: "หน่าย", nationality: "เมียนมา", nationality_code: "MM", gender: "หญิง",
    detected_location: "ระนอง (ตรวจพบที่ท่าเรือ)", 
    address: "ระนอง (ตรวจพบที่ท่าเรือ)", national_id: "0-8401-XXXXX-22-0", date_of_birth: "18/06/2545", passport_id: "PP-ILL02" 
  },
  { 
    id: "mock-ill-3", first_name_th: "จัน", last_name_th: "ทรา", nationality: "กัมพูชา", nationality_code: "KH", gender: "หญิง",
    detected_location: "สระแก้ว (ตรวจพบในพื้นที่เกษตร)", 
    address: "สระแก้ว (ตรวจพบในพื้นที่เกษตร)", national_id: "0-8401-XXXXX-33-0", date_of_birth: "22/12/2539", passport_id: "PP-ILL03" 
  },
  { 
    id: "mock-ill-4", first_name_th: "มิน", last_name_th: "อ่อง", nationality: "เมียนมา", nationality_code: "MM", gender: "ชาย",
    detected_location: "กาญจนบุรี", 
    address: "กาญจนบุรี", national_id: "0-8401-XXXXX-44-0", date_of_birth: "09/09/2533", passport_id: "PP-ILL04" 
  },
  { 
    id: "mock-ill-5", first_name_th: "เทือง", last_name_th: "วัน", nationality: "เวียดนาม", nationality_code: "VN", gender: "ชาย",
    detected_location: "สงขลา", 
    address: "สงขลา", national_id: "0-8401-XXXXX-55-0", date_of_birth: "14/04/2541", passport_id: "PP-ILL05" 
  },
];

// ─────────────────────────────────────────────
// คงตัวแปรเดิมไว้ เพื่อไม่ให้ไฟล์อื่นที่เคยเรียกตัวแปรเหล่านี้พัง (Backward Compatibility)
// ─────────────────────────────────────────────
export const MOCK_DEPORTED_DATA1: RepatriatedPerson[] = [MOCK_DEPORTED_DATA[0]];
export const MOCK_ILLEGAL_DATA2: IllegalImmigrant[] = [MOCK_ILLEGAL_DATA[0]];