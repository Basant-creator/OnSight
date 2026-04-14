const authService = require("../services/auth.service");

// Configure cookie options
const getCookieOptions = (maxAgeInMs) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: maxAgeInMs,
});

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days


const login = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await authService.loginUser(req.body, req.ip);

    res.cookie("accessToken", accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie("refreshToken", refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    return res.status(200).json({
      message: "Login successful",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;
    const { accessToken, refreshToken } = await authService.refreshUserToken(oldRefreshToken, req.ip);

    res.cookie("accessToken", accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie("refreshToken", refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshTokenToRevoke = req.cookies?.refreshToken;
    const userId = req.user?.id; // Assuming user is populated by auth middleware

    await authService.logoutUser(userId, refreshTokenToRevoke, req.ip);

    // Clear the cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout
};
