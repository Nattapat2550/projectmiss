const { processUploadMissingExcel } = require("../services/uploadService");

exports.getUploadProgress = (req, res) => {
    const jobId = req.params.jobId;
    res.json(global.uploadProgress[jobId] || { current: 0, total: 0, status: 'pending' });
};

exports.uploadMissingExcel = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) return res.status(400).json({ success: false, message: "กรุณาแนบไฟล์ Excel" });

        const action = req.query.action || "upload";
        const jobId = req.query.jobId;

        const result = await processUploadMissingExcel(req.file.buffer, action, jobId);

        if (result.action === "preview") {
            return res.status(200).json({ success: true, message: "ดึงข้อมูลพรีวิวสำเร็จ", total_rows: result.total_rows, preview_data: result.preview_data });
        }

        res.status(200).json({
            success: true,
            message: `บันทึกข้อมูลสำเร็จ ${result.successCount} จาก ${result.totalLength} รายการ`,
            errors: result.errors && result.errors.length > 0 ? result.errors : undefined
        });

    } catch (error) {
        console.error("Upload Excel Error:", error);
        res.status(500).json({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
    }
};
