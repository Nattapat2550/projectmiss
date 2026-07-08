import multer from "multer";

// เปลี่ยนมาใช้ Memory Storage แทนการบันทึกลง Harddisk (diskStorage)
// เพื่อให้ได้ req.file.buffer นำไปใช้สตรีมขึ้น Google Drive ทันที
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  // แนะนำให้ใส่ limits เพื่อป้องกันคนอัปโหลดไฟล์ใหญ่เกินไปจน RAM เต็ม
  limits: {
    fileSize: 10 * 1024 * 1024 // จำกัดขนาดไฟล์สูงสุด 10 MB (ปรับตัวเลขได้ตามต้องการ)
  }
});

export default upload;