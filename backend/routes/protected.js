const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const { authorizeRole, authorizePermission } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { createUserSchema } = require("../validations/user.validation");
const userController = require("../controllers/user.controller");

const router = express.Router();

// Admin provisioning endpoint
router.post(
  "/admin/create-user",
  authenticateToken,
  validate(createUserSchema),
  userController.createUser
);

// Example: Admin-only endpoint
router.get("/admin/dashboard", authenticateToken, authorizeRole("admin"), (req, res) => {
  return res.status(200).json({
    message: "Welcome to admin dashboard",
    user: req.user,
  });
});

// Example: Teacher-only endpoint (Admin will also have access due to hierarchy)
router.get("/teacher/questions", authenticateToken, authorizeRole("teacher"), (req, res) => {
  return res.status(200).json({
    message: "Teacher - Manage exam questions",
    user: req.user,
  });
});

// Example: Student-only endpoint (Teacher and Admin will also have access)
router.get("/student/exams", authenticateToken, authorizeRole("student"), (req, res) => {
  return res.status(200).json({
    message: "Available exams for student",
    user: req.user,
  });
});

// Example: Permission-based endpoint (Only roles with "view:analytics" like Teacher or Admin can access)
router.get("/analytics", authenticateToken, authorizePermission("view:analytics"), (req, res) => {
  return res.status(200).json({
    message: "Analytics data",
    user: req.user,
  });
});

module.exports = router;
