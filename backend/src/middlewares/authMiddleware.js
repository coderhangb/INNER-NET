const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token)
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded)
      return res.status(401).json({ message: "Unauthorized - Invalid token" });

    const user = await User.findOne({ _id: decoded.id }).select("-password"); // select all field except password
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in authMiddleware", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = authMiddleware;
