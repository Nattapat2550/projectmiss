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
    division_1 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.)
    division_2 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 2
    division_3 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 3
    division_4 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 4
    division_5 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 5
    division_6 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 6
    division_7 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 7
    division_8 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 8
    division_9 VARCHAR(255),               -- กรุณาเลือก กองบังคับการ (บก.) 9
    division_10 VARCHAR(255),              -- กรุณาเลือก กองบังคับการ (บก.) 10
    division_11 VARCHAR(255),              -- กรุณาเลือก กองบังคับการ (บก.) 11
    division_12 VARCHAR(255),              -- กรุณาเลือก กองบังคับการ (บก.) 12
    division_13 VARCHAR(255),              -- กรุณาเลือก กองบังคับการ (บก.) 13
    station VARCHAR(255),                  -- สังกัด สน./สภ.
    receiving_officer VARCHAR(255),        -- เจ้าหน้าที่ตำรวจผู้รับแจ้ง
    investigating_officer VARCHAR(255),    -- พนักงานสอบสวนผู้รับผิดชอบ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ตารางผู้แจ้งความ (informants)
CREATE TABLE informants (
    informant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    informant_name VARCHAR(255),           -- ผู้แจ้ง / ชื่อ - สกุล ผู้แจ้ง
    relationship VARCHAR(100),             -- ความสัมพันธ์
    informant_id_card_passport VARCHAR(50),-- เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้แจ้ง
    informant_contact_channel TEXT,        -- ช่องทางการติดต่อของผู้แจ้ง
    informant_phone VARCHAR(50),           -- เบอร์โทรศัพท์ ผู้แจ้ง
    informant_email VARCHAR(100),          -- อีเมล ผู้แจ้ง
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ตารางบุคคลสูญหายและข้อมูลการเดินทาง (missing_persons)
CREATE TABLE missing_persons (
    missing_person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    missing_person_name VARCHAR(255),       -- ชื่อบุคคลสูญหาย / ชื่อ - สกุล ผู้สูญหาย
    age INT,                               -- อายุ
    gender VARCHAR(50),                    -- เพศ
    nationality VARCHAR(100),              -- สัญชาติ / สัญชาติของผู้สูญหาย
    passport_number VARCHAR(50),           -- หมายเลขหนังสือเดินทาง
    missing_id_card_passport VARCHAR(50),  -- เลขประจำตัวประชาชน/เลขหนังสือเดินทาง ผู้สูญหาย
    entry_channel VARCHAR(255),            -- ช่องทางที่เดินทางเข้ามาในราชอาณาจักร
    entry_checkpoint_province VARCHAR(255),-- ชื่อด่านและจังหวัดที่เดินทางเข้า
    airline VARCHAR(100),                  -- สายการบิน (ถ้ามี)
    entry_date DATE,                       -- วันที่เดินทางเข้า
    last_seen_location_province VARCHAR(255),-- จุดที่พบเห็นครั้งสุดท้าย/จังหวัดที่เดินทางออก
    last_seen_date DATE,                   -- วันที่พบเห็นครั้งสุดท้าย
    missing_date DATE,                     -- วันที่สูญหาย หรือ คาดว่าสูญหาย
    missing_time TIME,                     -- เวลาสูญหาย หรือ คาดว่าสูญหาย
    missing_location TEXT,                 -- สถานที่สูญหาย หรือ คาดว่าสูญหาย
    photo_url TEXT,                        -- รูปภาพ (เก็บเป็น URL Link ไปยัง Object Storage)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ตารางคดีและการดำเนินการหลัก (cases)
CREATE TABLE cases (
    case_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(agency_id) ON DELETE SET NULL,
    informant_id UUID REFERENCES informants(informant_id) ON DELETE SET NULL,
    missing_person_id UUID REFERENCES missing_persons(missing_person_id) ON DELETE SET NULL,
    reported_date DATE,                    -- วัน/เดือน/ปี ที่รับแจ้ง / วันที่รับแจ้งวาม
    receiving_channel VARCHAR(255),        -- ช่องทางการรับแจ้ง
    incident_summary TEXT,                 -- พฤติการณ์ / พฤติการณ์โดยสังเขป
    case_number VARCHAR(100),              -- เลขคดี / เลขคดีที่
    pjv_number VARCHAR(100),               -- เลข ปจว. ที่
    pjv_file_url TEXT,                     -- อัพโหลด ปจว. รับแจ้งเหตุฯ (ถ้ามี) - PDF file หรือ ภาพถ่าย
    human_trafficking_indicators TEXT,     -- ข้อบ่งชี้ค้ามนุษย์
    victim_classification TEXT,            -- การคัดแยกเหยื่อ
    human_trafficking_type VARCHAR(255),   -- ประเภทของการค้ามนุษย์
    action_taken TEXT,                     -- การดำเนินการ
    operation_result TEXT,                 -- ผลการปฏิบัติ
    police_station VARCHAR(255),                -- สถานีตำรวจ (สน./สภ.) / สถานีตำรวจที่รับแจ้ง
    found_date DATE,                       -- วันที่พบตัว
    notes TEXT,                            -- หมายเหตุ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- การสร้าง Index สำหรับคอลัมน์ที่มักจะถูกค้นหาบ่อยเพื่อเพิ่มประสิทธิภาพ (Performance)
CREATE INDEX idx_cases_reported_date ON cases(reported_date);
CREATE INDEX idx_cases_case_number ON cases(case_number);
CREATE INDEX idx_missing_person_name ON missing_persons(missing_person_name);