const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(50, "Name is too long"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(['student', 'teacher', 'admin']).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

module.exports = {
  signupSchema,
  loginSchema,
};
