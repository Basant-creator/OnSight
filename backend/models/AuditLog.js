const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional because login failures might not have a resolved user
    },
    action: {
      type: String,
      required: true,
      enum: ["LOGIN_SUCCESS", "LOGIN_FAILED", "ACCESS_DENIED", "LOGOUT", "TOKEN_REFRESH", "SIGNUP"],
    },
    description: {
      type: String,
    },
    endpoint: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
