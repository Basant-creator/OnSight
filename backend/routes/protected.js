const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const { authorizeRole, authorizePermission } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { createUserSchema } = require("../validations/user.validation");
const userController = require("../controllers/user.controller");
const examController = require("../controllers/exam.controller");
const multer = require("multer");

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  }
});

const uploadMiddleware = (req, res, next) => {
  const multerUpload = upload.single("pdf");
  multerUpload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

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

// Teacher Exam Management Endpoints
router.post(
  "/teacher/exams/upload",
  authenticateToken,
  authorizeRole("teacher"),
  uploadMiddleware,
  examController.uploadAndParsePDF
);

router.post(
  "/teacher/exams",
  authenticateToken,
  authorizeRole("teacher"),
  examController.createExam
);

router.put(
  "/teacher/exams/:id/rename",
  authenticateToken,
  authorizeRole("teacher"),
  examController.renameExam
);

router.get(
  "/teacher/exams",
  authenticateToken,
  authorizeRole("teacher"),
  examController.getTeacherExams
);

router.get(
  "/teacher/exams/attempts",
  authenticateToken,
  authorizeRole("teacher"),
  examController.getAllAttemptsForTeacher
);

router.get(
  "/teacher/exams/:id/attempts",
  authenticateToken,
  authorizeRole("teacher"),
  examController.getExamAttempts
);

router.post(
  "/teacher/exams/:id/publish-results",
  authenticateToken,
  authorizeRole("teacher"),
  examController.publishResults
);

router.patch(
  "/teacher/exams/:id/schedule",
  authenticateToken,
  authorizeRole("teacher", "sub_admin", "head_admin"),
  examController.scheduleExam
);

// Example: Student-only endpoint (Teacher and Admin will also have access)
router.get(
  "/student/exams",
  authenticateToken,
  authorizeRole("student"),
  examController.getStudentExams
);

// Student Exam Attempt Endpoints
router.get(
  "/student/exams/:id/attempt",
  authenticateToken,
  authorizeRole("student"),
  examController.getExamForAttempt
);

router.post(
  "/student/exams/:id/submit",
  authenticateToken,
  authorizeRole("student"),
  examController.submitAttempt
);

router.get(
  "/student/attempts",
  authenticateToken,
  authorizeRole("student"),
  examController.getStudentAttempts
);

router.get(
  "/student/attempts/:attemptId",
  authenticateToken,
  authorizeRole("student"),
  examController.getAttemptDetails
);

// Example: Permission-based endpoint (Only roles with "view:analytics" like Teacher or Admin can access)
router.get("/analytics", authenticateToken, authorizePermission("view:analytics"), (req, res) => {
  return res.status(200).json({
    message: "Analytics data",
    user: req.user,
  });
});

module.exports = router;
