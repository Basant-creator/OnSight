const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const logAudit = require("../middleware/audit.middleware");
const authenticateToken = require("../middleware/auth.middleware"); // Needed for /logout

const router = express.Router();

// Apply Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "15m" } // Short lived access token
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    { expiresIn: "7d" } // Long lived refresh token
  );
};

router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const validRoles = ['student', 'teacher', 'admin'];
    const assignedRole = validRoles.includes(role) ? role : 'student';

    const createdUser = await User.create({
      name: name,
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
    });

    const accessToken = generateAccessToken(createdUser);
    const refreshToken = generateRefreshToken(createdUser);

    // Save refresh token to user
    createdUser.refreshTokens.push(refreshToken);
    await createdUser.save();

    await logAudit({
      userId: createdUser._id,
      action: "SIGNUP",
      description: "User registered successfully",
      endpoint: "/auth/signup",
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: "Signup successful",
      accessToken,
      refreshToken,
      user: {
        id: createdUser._id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      await logAudit({ action: "LOGIN_FAILED", description: "Invalid email", endpoint: "/auth/login", ipAddress: req.ip });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(String(password), user.password);

    if (!isPasswordValid) {
      await logAudit({ userId: user._id, action: "LOGIN_FAILED", description: "Invalid password", endpoint: "/auth/login", ipAddress: req.ip });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Add to active sessions
    user.refreshTokens.push(refreshToken);
    await user.save();

    await logAudit({ userId: user._id, action: "LOGIN_SUCCESS", description: "User logged in", endpoint: "/auth/login", ipAddress: req.ip });

    return res.status(200).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key");
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Token Rotation: Remove old, issue new
    user.refreshTokens = user.refreshTokens.filter(rt => rt !== refreshToken);
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    await logAudit({ userId: user._id, action: "TOKEN_REFRESH", description: "Tokens rotated", endpoint: "/auth/refresh", ipAddress: req.ip });

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired refresh token" });
  }
});

router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user.id);
    
    if (user && refreshToken) {
      user.refreshTokens = user.refreshTokens.filter(rt => rt !== refreshToken);
      await user.save();
    }

    await logAudit({ userId: req.user.id, action: "LOGOUT", description: "User logged out", endpoint: "/auth/logout", ipAddress: req.ip });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
