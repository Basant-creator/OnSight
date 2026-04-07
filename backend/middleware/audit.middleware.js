const AuditLog = require("../models/AuditLog");

const logAudit = async ({ userId, action, description, endpoint, ipAddress }) => {
  try {
    await AuditLog.create({
      user: userId,
      action,
      description,
      endpoint,
      ipAddress,
    });
  } catch (error) {
    console.error("Auditing error:", error);
  }
};

module.exports = logAudit;
