const roleHierarchy = {
  head_admin: ["head_admin", "sub_admin", "teacher", "student"],
  sub_admin: ["sub_admin", "teacher", "student"], 
  teacher: ["teacher", "student"], 
  student: ["student"], 
};

const permissions = {
  head_admin: ["*"], 
  sub_admin: [
    "create:teacher",
    "create:student",
    "read:users",
    "read:exams",
    "submit:exams",
    "manage:questions",
    "view:analytics",
  ],
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
