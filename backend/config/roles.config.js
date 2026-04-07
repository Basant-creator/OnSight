const roleHierarchy = {
  admin: ["admin", "teacher", "student"], // Admin can do everything
  teacher: ["teacher", "student"], // Teacher can do their stuff and student stuff
  student: ["student"], // Student can only do student stuff
};

const permissions = {
  admin: ["*"], // Wildcard for all
  teacher: [
    "read:exams",
    "submit:exams",
    "manage:questions",
    "view:analytics",
  ],
  student: ["read:exams", "submit:exams"],
};

module.exports = {
  roleHierarchy,
  permissions,
};
