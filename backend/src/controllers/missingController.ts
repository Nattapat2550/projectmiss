import * as missingService from "../services/missingService";
import * as cache from "../utils/cache";

export const getMissingPersons = async (req, res) => {
    try {
        const { page = 1, limit = 50, sortBy, sortOrder = "desc", search, command_center, division_name } = req.query;
        
        const result = await missingService.fetchMissingPersons({ page, limit, sortBy, sortOrder, search, command_center, division_name });

        res.status(200).json({
            success: true,
            meta: {
                totalItems: result.totalItems,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
            },
            tableData: result.tableData,
        });
    } catch (err) {
        console.error("Get Missing Persons Error:", err.message);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล: " + err.message });
    }
};

export const createMissingPerson = async (req, res) => {
    try {
        const { missing_first_name_th, missing_last_name_th } = req.body;

        if (!missing_first_name_th || !missing_first_name_th.trim() || !missing_last_name_th || !missing_last_name_th.trim()) {
            return res.status(400).json({ success: false, message: "กรุณากรอกชื่อและนามสกุลบุคคลสูญหาย" });
        }

        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const photoFile = files?.["photo"]?.[0];
        const passportPhotoFile = files?.["passport_photo"]?.[0];
        const pjvFile = files?.["pjv_file"]?.[0];

        const missing_person_id = await missingService.createMissingPersonRecord(req.body, photoFile, passportPhotoFile, pjvFile);

        cache.clear();

        res.status(201).json({
            success: true,
            message: "บันทึกข้อมูลบุคคลสูญหายสำเร็จ",
            missing_person_id,
        });
    } catch (err) {
        console.error("Create Missing Person Error:", err.message);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message });
    }
};

export const getMissingPersonById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await missingService.fetchMissingPersonById(id);

        if (!data) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลบุคคลสูญหาย' });
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Get Missing Person By ID Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateMissingPerson = async (req, res) => {
    try {
        const { id } = req.params;
        
        const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const photoFile = files?.["photo"]?.[0];
        const passportPhotoFile = files?.["passport_photo"]?.[0];
        const pjvFile = files?.["pjv_file"]?.[0];
        
        await missingService.updateMissingPersonRecord(id, req.body, photoFile, passportPhotoFile, pjvFile);

        cache.clear();

        res.status(200).json({ success: true, message: "แก้ไขข้อมูลสำเร็จ" });
    } catch (error) {
        console.error("Update Missing Person Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteMissingPerson = async (req, res) => {
    try {
        const { id } = req.params;
        
        await missingService.removeMissingPerson(id);

        cache.clear();

        res.status(200).json({ success: true, message: "ลบข้อมูลสำเร็จ" });
    } catch (error) {
        console.error("Delete Missing Person Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};