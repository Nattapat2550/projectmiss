const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ฟังก์ชันสร้าง JWT Token ปิดช่องโหว่ Hardcoded Secret
const getSignedJwtToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("ระบบขาดการตั้งค่า JWT_SECRET ใน Environment Variables");
  }

  return jwt.sign({ id }, secret, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// ฟังก์ชันส่ง Token กลับไปทาง Cookie และ JSON
const sendTokenResponse = (user, statusCode, res) => {
  const token = getSignedJwtToken(user.id);

  const expireDays = parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 30;

  const options = {
    expires: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    path: "/", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  };

  res.status(statusCode).cookie("token", token, options).json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      color: user.color,
    },
  });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
exports.register = async (req, res) => {
  try {
    const { name, password, role, color } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, msg: "Please provide a name and password" });
    }

    const existingUserResult = await pool.query("SELECT id FROM users WHERE name = $1", [name]);
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ success: false, msg: "Name already in use" });
    }

    const userRole = role || "user";
    const userColor = color || "#3B82F6";

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insertQuery = `
      INSERT INTO users (name, password, role, color) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *;
    `;
    const newUserResult = await pool.query(insertQuery, [name, hashedPassword, userRole, userColor]);
    const user = newUserResult.rows[0];

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: err.message || "Server error during registration" });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
exports.login = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, msg: "Please provide a name and password" });
    }

    const userResult = await pool.query("SELECT * FROM users WHERE name = $1", [name]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, msg: err.message || "Server error" });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
exports.logout = async (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    path: "/",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production"
  });

  res.setHeader("Clear-Site-Data", '"cookies", "storage"');
  res.status(200).json({ success: true, data: {} });
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
exports.getMe = async (req, res) => {
  try {
    const userResult = await pool.query("SELECT id, name, role, color FROM users WHERE id = $1", [req.user.id]);
    const user = userResult.rows[0];
    
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, color } = req.body;
    const userResult = await pool.query(
      "UPDATE users SET name = $1, color = $2 WHERE id = $3 RETURNING id, name, role, color",
      [name, color, req.user.id]
    );
    res.status(200).json({ success: true, data: userResult.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/password
exports.updatePassword = async (req, res) => {
  try {
    const { password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, req.user.id]
    );
    res.status(200).json({ success: true, msg: "อัปเดตรหัสผ่านสำเร็จ" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};