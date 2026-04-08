const { z } = require("zod");

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").max(50, "Name is too long"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(['student', 'teacher', 'sub_admin', 'head_admin'], {
    errorMap: () => ({ message: "Invalid role specified" }),
  }),
});

module.exports = {
  createUserSchema,
};
