const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const { loginSchema } = require("../validations/auth.validation");
const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

// Apply Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
});


router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticateToken, authController.logout);

module.exports = router;
