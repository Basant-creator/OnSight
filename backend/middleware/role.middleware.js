const { roleHierarchy, permissions } = require("../config/roles.config");
const logAudit = require("./audit.middleware");

const authorizeRole = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userRole = req.user.role;
    const userHierarchy = roleHierarchy[userRole] || [];

    // Check if user's hierarchy roles intersect with allowed roles
    const hasAccess = allowedRoles.some((role) => userHierarchy.includes(role));

    if (!hasAccess) {
      await logAudit({
        userId: req.user.id,
        action: "ACCESS_DENIED",
        description: `Failed role check. Required: ${allowedRoles.join(", ")}`,
        endpoint: req.originalUrl,
        ipAddress: req.ip,
      });
      return res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};

const authorizePermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userRole = req.user.role;
    const userPermissions = permissions[userRole] || [];

    const hasAccess = userPermissions.includes("*") || userPermissions.includes(requiredPermission);

    if (!hasAccess) {
      await logAudit({
        userId: req.user.id,
        action: "ACCESS_DENIED",
        description: `Failed permission check. Required: ${requiredPermission}`,
        endpoint: req.originalUrl,
        ipAddress: req.ip,
      });
      return res.status(403).json({
        error: `Access denied. Required permission: ${requiredPermission}`,
      });
    }

    next();
  };
};

module.exports = { authorizeRole, authorizePermission };
