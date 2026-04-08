const userService = require("../services/user.service");
const { permissions } = require("../config/roles.config");

const createUser = async (req, res, next) => {
  try {
    const { role } = req.body;
    const creatorRole = req.user.role;

    // RBAC Check for target role
    if (creatorRole !== 'head_admin') {
      const allowedPermissions = permissions[creatorRole] || [];
      const requiredPermission = `create:${role}`;
      
      if (!allowedPermissions.includes(requiredPermission)) {
         return res.status(403).json({ 
           error: `Forbidden: Your role (${creatorRole}) is not authorized to provision a '${role}' account.` 
         });
      }
    }

    const newUser = await userService.provisionUser(req.body, req.user.id, req.ip);

    return res.status(201).json({
      message: "User successfully provisioned",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
};
