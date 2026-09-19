const User = require("../models/User.js");
const { createToken } = require("../libs/utils.js");

const getCookieOptions = (req) => {
  const host = req?.headers?.host || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  if (isLocal) {
    return {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      secure: false,
      sameSite: "lax",
    };
  }

  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const isTunnelSecure =
    req?.secure || (forwardedProto && forwardedProto.includes("https"));

  return {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: Boolean(isTunnelSecure),
    sameSite: isTunnelSecure ? "none" : "lax",
  };
};

function handleError(error) {
  console.log(error.message);

  const err = {
    fullName: "",
    email: "",
    password: "",
    role: "",
  };

  // Sai email hoặc mật khẩu.
  if (
    error.message === "Incorrect email" ||
    error.message === "Incorrect password"
  ) {
    err.email = "Invalid email or password";
    err.password = "Invalid email or password";
    return err;
  }

  // Email đã tồn tại.
  if (error.code === 11000) {
    err.email =
      "This email is already registered. Please log in or use a different email.";
    return err;
  }

  // Dữ liệu không hợp lệ theo schema.
  if (error.name === "ValidationError" && error.errors) {
    Object.values(error.errors).forEach((fieldError) => {
      const path = fieldError.properties?.path || fieldError.path;
      const message = fieldError.properties?.message || fieldError.message;

      if (Object.prototype.hasOwnProperty.call(err, path)) {
        err[path] = message;
      }
    });
  }

  return err;
}

async function signupPost(req, res) {
  const { fullName, email, password, role } = req.body;

  try {
    const user = await User.create({
      fullName,
      email,
      password,
      role,
    });

    res.cookie("jwt", createToken(user._id), getCookieOptions(req));

    return res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json(handleError(error));
    }

    if (error.name === "ValidationError") {
      return res.status(400).json(handleError(error));
    }

    console.error("Signup failed:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

async function loginPost(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);

    res.cookie("jwt", createToken(user._id), getCookieOptions(req));

    return res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    if (
      error.message === "Incorrect email" ||
      error.message === "Incorrect password"
    ) {
      return res.status(401).json(handleError(error));
    }

    console.error("Login failed:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

async function logoutPost(req, res) {
  const cookieOptions = getCookieOptions(req);

  // Khi xóa cookie, không truyền thời gian sống.
  delete cookieOptions.maxAge;

  res.clearCookie("jwt", cookieOptions);

  return res.status(200).json({
    message: "Logout success",
  });
}

module.exports = {
  signupPost,
  loginPost,
  logoutPost,
};
