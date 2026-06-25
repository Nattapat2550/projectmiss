-- สร้าง Enum สำหรับ result ก่อน
CREATE TYPE deported_result_enum AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- สร้างตาราง users ก่อน เพื่อให้ตารางอื่นอ้างอิง Foreign Key (created_by) ได้
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  color VARCHAR(7) DEFAULT '#3B82F6'
);

-- ตาราง แอบเข้า (Illegal Immigrants)
CREATE TABLE illegal_immigrants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name_th VARCHAR(255) NOT NULL,
    middle_name_th VARCHAR(255),
    last_name_th VARCHAR(255) NOT NULL,
    first_name_en VARCHAR(255),
    middle_name_en VARCHAR(255),
    last_name_en VARCHAR(255),
    nationality VARCHAR(255),
    passport_id VARCHAR(255),
    detected_location TEXT NOT NULL,
    is_victim BOOLEAN,
    gender VARCHAR(50),
    detected_date DATE,
    workplace VARCHAR(255),
    screening_details TEXT,
    photo_url TEXT,
    note TEXT,
    -- ส่วนที่เก็บข้อมูลคนที่เพิ่มและเวลาที่เพิ่ม
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ตาราง ส่งกลับ (Deported Persons)
CREATE TABLE deported_persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ข้อมูลชื่อ-นามสกุล
    first_name_th VARCHAR(255) NOT NULL,
    middle_name_th VARCHAR(255),
    last_name_th VARCHAR(255) NOT NULL,
    first_name_en VARCHAR(255),
    middle_name_en VARCHAR(255),
    last_name_en VARCHAR(255),
    
    -- ข้อมูลส่วนตัว
    date_of_birth DATE,
    age INT,
    national_id VARCHAR(50) UNIQUE NOT NULL,  -- ตรงกับ id_card
    passport_id VARCHAR(255) UNIQUE,          -- ตรงกับ passport
    gender VARCHAR(50),
    address TEXT NOT NULL,
    photo_url TEXT,                           -- เก็บ URL รูปภาพ หรือ Base64 string ยาวๆ
    
    -- ข้อมูลสถานที่และรูปแบบงาน
    building VARCHAR(255),
    floor VARCHAR(100),
    room VARCHAR(100),
    job_type VARCHAR(255),
    role VARCHAR(255),
    
    -- ข้อมูลการเงิน
    salary VARCHAR(100),                      -- ใช้ VARCHAR เผื่อข้อมูลใน Excel ใส่คอมม่ามาเช่น "15,000"
    paid_by VARCHAR(255),
    payment_method VARCHAR(255),
    
    -- ข้อมูลทางคดีและหน่วยงาน
    number_of_case INT NOT NULL DEFAULT 0,    -- ตรงกับ case_id_count (ควรแปลงให้เป็นตัวเลขก่อนลง DB)
    number_of_warrant INT NOT NULL DEFAULT 0, -- ตรงกับ warrant (ควรแปลงให้เป็นตัวเลขก่อนลง DB)
    victim_indicator VARCHAR(255),            -- มีข้อบ่งชี้ / ไม่มีข้อบ่งชี้
    responsible_agency VARCHAR(255),          -- หน่วยงานที่รับผิดชอบ
    
    -- ข้อมูลการส่งกลับและอื่นๆ
    return_date DATE,
    channel VARCHAR(255),
    note TEXT,                                -- หมายเหตุ
    result deported_result_enum NOT NULL DEFAULT 'PENDING',

    -- ส่วนที่เก็บข้อมูลคนที่เพิ่มและเวลาที่เพิ่ม
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);