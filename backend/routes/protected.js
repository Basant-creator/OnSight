const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const authorizeRole = require("../middleware/role.middleware");

const router = express.Router();

// Example: Admin-only endpoint
router.get("/admin/dashboard", authenticateToken, authorizeRole("admin"), (req, res) => {
  return res.status(200).json({
    message: "Welcome to admin dashboard",
    user: req.user,
  });
});

// Example: Teacher-only endpoint
router.get("/teacher/questions", authenticateToken, authorizeRole("teacher"), (req, res) => {
  return res.status(200).json({
    message: "Teacher - Manage exam questions",
    user: req.user,
  });
});

// Example: Student-only endpoint
router.get("/student/exams", authenticateToken, authorizeRole("student"), (req, res) => {
  return res.status(200).json({
    message: "Available exams for student",
    user: req.user,
  });
});

// Example: Multiple roles allowed
router.get("/submit-exam", authenticateToken, authorizeRole("student", "teacher"), (req, res) => {
  return res.status(200).json({
    message: "Exam submitted successfully",
    user: req.user,
  });
});

module.exports = router;
