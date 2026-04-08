const bcrypt = require("bcryptjs");
const User = require("../models/User");
const logAudit = require("../middleware/audit.middleware");

const provisionUser = async ({ name, email, password, role }, creatorId, ipAddress) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error("Email already exists in the system");
    error.status = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);

  const createdUser = await User.create({
    name,
    email: normalizedEmail,
    password: hashedPassword,
    role: role, // Validated by Zod
  });

  await logAudit({
    userId: creatorId,
    action: "PROVISION_USER",
    description: `Provisioned new account for ${email} with role ${role}`,
    endpoint: "/api/admin/create-user",
    ipAddress,
  });

  return createdUser;
};

module.exports = {
  provisionUser,
};
