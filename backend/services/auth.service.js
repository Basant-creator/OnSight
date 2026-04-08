const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logAudit = require("../middleware/audit.middleware");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt.utils");

const MAX_SESSIONS = 5;

const manageRefreshTokens = async (user, newRefreshToken) => {
  user.refreshTokens.push(newRefreshToken);
  if (user.refreshTokens.length > MAX_SESSIONS) {
    // Keep only the most recent tokens
    user.refreshTokens = user.refreshTokens.slice(-MAX_SESSIONS);
  }
  await user.save();
};

const signupUser = async ({ name, email, password, role }, ipAddress) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error("Email already exists");
    error.status = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);
  const validRoles = ["student", "teacher", "admin"];
  const assignedRole = validRoles.includes(role) ? role : "student";

  const createdUser = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: assignedRole,
  });

  const accessToken = generateAccessToken(createdUser);
  const refreshToken = generateRefreshToken(createdUser);

  await manageRefreshTokens(createdUser, refreshToken);

  await logAudit({
    userId: createdUser._id,
    action: "SIGNUP",
    description: "User registered successfully",
    endpoint: "/auth/signup",
    ipAddress,
  });

  return { user: createdUser, accessToken, refreshToken };
};

const loginUser = async ({ email, password }, ipAddress) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    await logAudit({ action: "LOGIN_FAILED", description: "Invalid email", endpoint: "/auth/login", ipAddress });
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(String(password), user.password);

  if (!isPasswordValid) {
    await logAudit({ userId: user._id, action: "LOGIN_FAILED", description: "Invalid password", endpoint: "/auth/login", ipAddress });
    const error = new Error("Invalid email or password");
    error.status = 401;
    throw error;
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await manageRefreshTokens(user, refreshToken);

  await logAudit({ userId: user._id, action: "LOGIN_SUCCESS", description: "User logged in", endpoint: "/auth/login", ipAddress });

  return { user, accessToken, refreshToken };
};

const refreshUserToken = async (oldRefreshToken, ipAddress) => {
  if (!oldRefreshToken) {
    const error = new Error("Refresh token is required");
    error.status = 401;
    throw error;
  }

  try {
    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key");
    const user = await User.findById(decoded.id);

    if (!user || !user.refreshTokens.includes(oldRefreshToken)) {
      const error = new Error("Invalid refresh token");
      error.status = 403;
      throw error;
    }

    // Token Rotation: Remove old, issue new
    user.refreshTokens = user.refreshTokens.filter(rt => rt !== oldRefreshToken);
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    await manageRefreshTokens(user, newRefreshToken);

    await logAudit({ userId: user._id, action: "TOKEN_REFRESH", description: "Tokens rotated", endpoint: "/auth/refresh", ipAddress });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (err) {
    if (err.status) throw err;
    const error = new Error("Invalid or expired refresh token");
    error.status = 403;
    throw error;
  }
};

const logoutUser = async (userId, refreshTokenToRevoke, ipAddress) => {
  const user = await User.findById(userId);
  
  if (user && refreshTokenToRevoke) {
    user.refreshTokens = user.refreshTokens.filter(rt => rt !== refreshTokenToRevoke);
    await user.save();
  }

  await logAudit({ userId, action: "LOGOUT", description: "User logged out", endpoint: "/auth/logout", ipAddress });
};

module.exports = {
  signupUser,
  loginUser,
  refreshUserToken,
  logoutUser,
};
