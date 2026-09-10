const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

async function authMiddleware(req, res, next) {
  // 1. Lấy token từ cookie.
  const token = req.cookies?.jwt;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized - No token provided",
    });
  }

  // 2. Thiếu cấu hình là lỗi server, không phải lỗi đăng nhập.
  if (!process.env.JWT_SECRET) {
    console.error("authMiddleware: JWT_SECRET is not configured");

    return res.status(500).json({
      message: "Server error",
    });
  }

  // 3. Kiểm tra chữ ký, thời hạn và nội dung token.
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Unauthorized - Token expired",
      });
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        message: "Unauthorized - Invalid token",
      });
    }

    console.error("authMiddleware: Token verification failed", error);

    return res.status(500).json({
      message: "Server error",
    });
  }

  // Dự án lưu ID người dùng trong trường "id" của token.
  // Kiểm tra trước để ID sai không gây lỗi truy vấn MongoDB.
  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.id !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(decoded.id)
  ) {
    return res.status(401).json({
      message: "Unauthorized - Invalid token",
    });
  }

  // 4. Tìm người dùng. Lỗi DB được xử lý riêng.
  let user;

  try {
    user = await User.findById(decoded.id).select("-password");
  } catch (error) {
    console.error("authMiddleware: User lookup failed", error);

    return res.status(500).json({
      message: "Server error",
    });
  }

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized - User not found",
    });
  }

  // 5. Xác thực thành công: chuyển sang bước xử lý tiếp theo.
  req.user = user;
  return next();
}

module.exports = authMiddleware;