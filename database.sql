-- สร้างตาราง users ก่อน เพื่อให้ตารางอื่นอ้างอิง Foreign Key (created_by) ได้
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  color VARCHAR(7) DEFAULT '#3B82F6'
);

-- 1. ตารางหน่วยงานและเจ้าหน้าที่ (agencies)
CREATE TABLE agencies (
    agency_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_center VARCHAR(255),           -- กองบัญชาการที่รับแจ้ง / กรุณาเลือก กองบัญชาการ (บช.)
    division_type VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 1-13
    division_name VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.)
    station VARCHAR(255),                  -- สังกัด สน./สภ.
    officer_name VARCHAR(255),             -- ชื่อพนักงานสอบสวน/ตำรวจ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางผู้แจ้งความ (informants)
CREATE TABLE informants (
    informant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name_th VARCHAR(255) NOT NULL,
    middle_name_th VARCHAR(255),
    last_name_th VARCHAR(255) NOT NULL,
    first_name_en VARCHAR(255),
    middle_name_en VARCHAR(255),
    last_name_en VARCHAR(255),
    date_of_birth DATE,                               -- วันเกิด
    gender VARCHAR(50),
    nationality VARCHAR(100),
    informant_id_card_passport VARCHAR(50),-- เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้แจ้ง
    informant_contact_channel TEXT,        -- ช่องทางการติดต่อของผู้แจ้ง
    informant_phone VARCHAR(50),           -- เบอร์โทรศัพท์ ผู้แจ้ง
    informant_email VARCHAR(100),          -- อีเมล ผู้แจ้ง
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางบุคคลสูญหายและข้อมูลพื้นฐานบุคคล (missing_persons)
CREATE TABLE missing_persons (
    missing_person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name_th VARCHAR(255) NOT NULL,
    middle_name_th VARCHAR(255),
    last_name_th VARCHAR(255) NOT NULL,
    first_name_en VARCHAR(255),
    middle_name_en VARCHAR(255),
    last_name_en VARCHAR(255),
    date_of_birth DATE,                               -- วันเกิด
    gender VARCHAR(50),                    -- เพศ
    nationality VARCHAR(100),              -- สัญชาติ / สัญชาติของผู้สูญหาย
    passport_number VARCHAR(50),           -- หมายเลขหนังสือเดินทาง
    missing_id_card_passport VARCHAR(50),  -- เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้สูญหาย
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตารางคดีและการดำเนินการหลัก (cases)
CREATE TABLE cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(agency_id) ON DELETE SET NULL,
    informant_id UUID REFERENCES informants(informant_id) ON DELETE SET NULL,
    missing_person_id UUID REFERENCES missing_persons(missing_person_id) ON DELETE SET NULL,
    
    -- ข้อมูลที่ย้ายมาจาก informants (เพราะคดีนึงอาจมีความสัมพันธ์กับคนแจ้งต่างกันไป)
    relationship VARCHAR(100),             -- ความสัมพันธ์
    
    -- ข้อมูลที่ย้ายมาจาก missing_persons (เพราะ 1 คนอาจจะหายได้หลายครั้ง หรือเดินทางเข้าออกแบบใหม่)
    entry_channel VARCHAR(255),            -- ช่องทางที่เดินทางเข้ามาในราชอาณาจักร
    entry_checkpoint_province VARCHAR(255),-- ชื่อด่านและจังหวัดที่เดินทางเข้า
    airline VARCHAR(100),                  -- สายการบิน (ถ้ามี)
    entry_date DATE,                       -- วันที่เดินทางเข้า
    detected_location_details TEXT,
    detected_location_sub_district VARCHAR(255),
    detected_location_district VARCHAR(255),
    detected_location_province VARCHAR(255),
    missing_date DATE,                     -- วันที่สูญหาย หรือ คาดว่าสูญหาย
    missing_time TIME,                     -- เวลาสูญหาย หรือ คาดว่าสูญหาย
    photo_url TEXT,                        -- รูปภาพ (เก็บเป็น URL Link ไปยัง Object Storage)
    
    -- ข้อมูลที่ย้ายมาจาก agencies
    investigating_id UUID REFERENCES agencies(agency_id) ON DELETE SET NULL,    -- พนักงานสอบสวนผู้รับผิดชอบ
    
    -- ข้อมูลคดีเดิม
    reported_date DATE,                    -- วัน/เดือน/ปี ที่รับแจ้ง / วันที่รับแจ้งวาม
    receiving_channel VARCHAR(255),        -- ช่องทางการรับแจ้ง
    incident_summary TEXT,                 -- พฤติการณ์ / พฤติการณ์โดยสังเขป
    case_number VARCHAR(100),              -- เลขคดี / เลขคดีที่
    pjv_number VARCHAR(100),               -- เลข ปจว. ที่
    pjv_file_url TEXT,                     -- อัพโหลด ปจว. รับแจ้งเหตุฯ (ถ้ามี) - PDF file หรือ ภาพถ่าย
    human_trafficking_indicators BOOLEAN,     -- ข้อบ่งชี้ค้ามนุษย์
    victim_classification TEXT,            -- การคัดแยกเหยื่อ
    human_trafficking_type VARCHAR(255),   -- ประเภทของการค้ามนุษย์
    action_taken TEXT,                     -- การดำเนินการ
    operation_result BOOLEAN,                 -- ผลการปฏิบัติ
    found_date DATE,                       -- วันที่พบตัว
    notes TEXT,                            -- หมายเหตุ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- การสร้าง Index สำหรับคอลัมน์ที่มักจะถูกค้นหาบ่อยเพื่อเพิ่มประสิทธิภาพ (Performance)
CREATE INDEX idx_cases_reported_date ON cases(reported_date);
CREATE INDEX idx_cases_case_number ON cases(case_number);