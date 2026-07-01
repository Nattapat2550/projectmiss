const missingService = require("../services/missingService");

exports.getMissingPersons = async (req, res) => {
    try {
        const { page = 1, limit = 50, sortBy, sortOrder = "desc", search } = req.query;
        
        const result = await missingService.fetchMissingPersons({ page, limit, sortBy, sortOrder, search });

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

exports.createMissingPerson = async (req, res) => {
    try {
        const { missing_first_name_th, missing_last_name_th } = req.body;

        if (!missing_first_name_th || !missing_first_name_th.trim() || !missing_last_name_th || !missing_last_name_th.trim()) {
            return res.status(400).json({ success: false, message: "กรุณากรอกชื่อและนามสกุลบุคคลสูญหาย" });
        }

        const missing_person_id = await missingService.createMissingPersonRecord(req.body, req.file);

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

exports.getMissingPersonById = async (req, res) => {
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

exports.updateMissingPerson = async (req, res) => {
    try {
        const { id } = req.params;
        
        await missingService.updateMissingPersonRecord(id, req.body, req.file);

        res.status(200).json({ success: true, message: "แก้ไขข้อมูลสำเร็จ" });
    } catch (error) {
        console.error("Update Missing Person Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteMissingPerson = async (req, res) => {
    try {
        const { id } = req.params;
        
        await missingService.removeMissingPerson(id);

        res.status(200).json({ success: true, message: "ลบข้อมูลสำเร็จ" });
    } catch (error) {
        console.error("Delete Missing Person Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};