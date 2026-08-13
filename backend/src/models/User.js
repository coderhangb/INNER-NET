const mongoose = require("mongoose");
const { isEmail } = require("validator");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter an email"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [isEmail, "Please enter a valid email"],
    },
    password: {
      type: String,
      minlength: [6, "Password must have at least 6 characters"],
      required: [true, "Please enter an password"],
    },
  },
  //   { timestamps: true }, //createAt && updateAt
);

// hash password
userSchema.pre("save", async function () {
  const salt = await bcryptjs.genSalt();
  this.password = await bcryptjs.hash(this.password, salt);
});

userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error("Incorrect email");
  const match = await bcryptjs.compare(password, user.password);
  if (!match) throw new Error("Incorrect password");
  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
