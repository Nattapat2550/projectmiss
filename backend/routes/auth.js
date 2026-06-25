const express = require("express");
const { register, login, getMe, logout, updateProfile, updatePassword } = require("../controllers/auth");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", protect, logout);
router.get("/me", protect, getMe);

// เพิ่มเส้นทางสำหรับอัปเดตข้อมูลผู้ใช้งาน
router.put("/profile", protect, updateProfile);
router.put("/password", protect, updatePassword);

module.exports = router;