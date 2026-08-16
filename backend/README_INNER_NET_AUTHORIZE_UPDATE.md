# INNER-NET Backend – Authentication & Role Authorization Update

This README documents the latest backend updates made to the authentication and role-based authorization system of the INNER-NET project.

## 1. What was changed

The backend authentication system was updated to support multiple user roles:

- `student`
- `parents`
- `teacher`

The authentication and authorization responsibilities are now separated:

```text
Authentication
    ↓
Authorization
```

- `authMiddleware` → verifies the JWT, finds the user, and stores the user in `req.user`.
- `authorizeRoleMiddleware` → checks whether the authenticated user has the required role.

The JWT only stores the user's ID. The user's role is retrieved from MongoDB through `req.user.role`.

---

## 2. Updated User Schema

The `User` model now contains a `role` field:

```js
const mongoose = require("mongoose");
const { isEmail } = require("validator");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema({
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

  role: {
    type: String,
    enum: ["student", "parents", "teacher"],
    required: [true, "Please choose who you are to continue"],
  },
});
```

The `role` field only accepts:

```text
student
parents
teacher
```

---

## 3. Signup

Signup now accepts the user's role:

```js
const { fullName, email, password, role } = req.body;

const user = await User.create({
  fullName,
  email,
  password,
  role,
});
```

Example request:

```json
{
  "fullName": "Nguyen Van A",
  "email": "student@gmail.com",
  "password": "123456",
  "role": "student"
}
```

Example response:

```json
{
  "_id": "...",
  "fullName": "Nguyen Van A",
  "email": "student@gmail.com",
  "role": "student"
}
```

The backend validates the role through the Mongoose `enum`.

---

## 4. Login

Login continues to use email and password:

```js
const { email, password } = req.body;

const user = await User.login(email, password);
```

The response now also includes the user's role:

```json
{
  "_id": "...",
  "fullName": "Nguyen Van A",
  "email": "student@gmail.com",
  "role": "student"
}
```

---

## 5. Authentication Middleware

The `authMiddleware.js` is responsible for authentication.

It:

1. Reads the JWT from the cookie.
2. Verifies the JWT.
3. Gets the user ID from the JWT.
4. Finds the user in MongoDB.
5. Excludes the password.
6. Stores the user in `req.user`.

Example:

```js
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

    const user = await User.findOne({ _id: decoded.id }).select("-password");
    if (!user) return res.status(401).json({ message: "User not found" });

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in authMiddleware", error);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = authMiddleware;
```

After authentication, `req.user` contains the user from MongoDB.

Example:

```js
req.user = {
  _id: "...",
  fullName: "Nguyen Van A",
  email: "student@gmail.com",
  role: "student",
};
```

The password is excluded with:

```js
.select("-password")
```

---

## 6. Authorization Middleware

The `authorizeRoleMiddleware.js` is responsible only for checking roles.

It does not verify the JWT again.

Example:

```js
const authorizeRoleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  };
};

module.exports = authorizeRoleMiddleware;
```

The middleware can accept one or multiple roles.

For one role:

```js
authorizeRoleMiddleware("teacher");
```

For multiple roles:

```js
authorizeRoleMiddleware("teacher", "parents");
```

---

## 7. Authentication vs Authorization

The backend now separates the two responsibilities.

### Authentication

```text
authMiddleware.js
```

Answers:

```text
"Who is this user?"
```

It handles:

- JWT verification
- User lookup
- `req.user`

### Authorization

```text
authorizeRoleMiddleware.js
```

Answers:

```text
"Is this user allowed to access this resource?"
```

It handles:

- Role checking
- Access control

---

## 8. Example Route Usage

A route that only requires authentication:

```js
router.post("/chat", authMiddleware, chatWithLLM);
```

A route that requires a teacher:

```js
router.get(
  "/teacher/dashboard",
  authMiddleware,
  authorizeRoleMiddleware("teacher"),
  teacherDashboard,
);
```

A route that allows teachers and parents:

```js
router.get(
  "/reports",
  authMiddleware,
  authorizeRoleMiddleware("teacher", "parents"),
  getReports,
);
```

The middleware order is important:

```text
authMiddleware
      ↓
authorizeRoleMiddleware
      ↓
controller
```

`authorizeRoleMiddleware` should run after `authMiddleware` because it depends on:

```js
req.user;
```

---

## 9. Current Authentication Flow

```text
Frontend
    ↓
JWT HTTP-only Cookie
    ↓
authMiddleware
    ↓
jwt.verify()
    ↓
decoded.id
    ↓
User.findById(decoded.id)
    ↓
req.user = user
    ↓
authorizeRoleMiddleware("teacher")
    ↓
req.user.role
    ↓
Access granted / denied
    ↓
Controller
```

---

## 10. Error Handling

The authentication controller now handles validation errors for:

```text
fullName
email
password
role
```

Example error object:

```js
let err = {
  fullName: "",
  email: "",
  password: "",
  role: "",
};
```

Mongoose validation errors are mapped to the corresponding fields:

```js
Object.values(error.errors).forEach(({ properties }) => {
  err[properties.path] = properties.message;
});
```
