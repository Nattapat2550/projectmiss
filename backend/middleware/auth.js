const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token; 
  }

  if (!token || token === "null") {
    return res.status(401).json({
      success: false,
      message: "Not authorize to access this route",
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ success: false, message: "Server misconfiguration: Missing JWT_SECRET" });
    }
    const decoded = jwt.verify(token, secret);
    
    // ค้นหา User ผ่าน Native Pool แทน Prisma
    const result = await pool.query("SELECT id, name, role, color FROM users WHERE id = $1", [decoded.id]);
    req.user = result.rows[0];

    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "User not found, authorization denied",
        });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      success: false,
      message: "Not authorize to access this route",
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};