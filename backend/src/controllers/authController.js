const User = require("../models/User.js");
const { createToken } = require("../libs/utils.js");

function handleError(error) {
  console.log(error.message);
  let err = {
    fullName: "",
    email: "",
    password: "",
  };

  // incorrect email/password
  if (
    error.message === "Incorrect email" ||
    error.message === "Incorrect password"
  ) {
    err.email = "Invalid email or password";
    err.password = "Invalid email or password";
    return err;
  }

  // duplicate error code
  if (error.code === 11000) {
    err.email =
      "This email is already registered. Please log in or use a different email.";
    return err;
  }

  // validation error
  if (error.message.includes("User validation failed")) {
    Object.values(error.errors).forEach(({ properties }) => {
      err[properties.path] = properties.message;
    });
  }

  return err;
}

async function signupPost(req, res) {
  const { fullName, email, password } = req.body;
  try {
    const user = await User.create({ fullName, email, password });
    res.cookie("jwt", createToken(user._id), {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "none",
      secure: true,
    });

    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profileAvatar: user.profileAvatar,
    });
  } catch (error) {
    const err = handleError(error);
    res.status(400).json(err);
  }
}

async function loginPost(req, res) {
  const { email, password } = req.body;
  try {
    const user = await User.login(email, password);
    res.cookie("jwt", createToken(user._id), {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profileAvatar: user.profileAvatar,
    });
  } catch (error) {
    const err = handleError(error);
    res.status(400).json(err);
  }
}

async function logoutPost(req, res) {
  res.cookie("jwt", "", { maxAge: 1 });
  res.status(200).json({ message: "Logout success" });
}

module.exports = {
  signupPost,
  loginPost,
  logoutPost,
};
