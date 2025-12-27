const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const verify2faSchema = z.object({
  tempToken: z.string().min(10),
  code: z.string().min(6).max(8), // TOTP commonly 6 digits
});

const setup2faStartSchema = z.object({
  // optional label override; usually not needed
  label: z.string().min(2).max(64).optional(),
});

const setup2faConfirmSchema = z.object({
  tempToken: z.string().min(10),
  code: z.string().min(6).max(8),
});

const adminReset2faSchema = z.object({
  userId: z.string().min(5), // Mongo ObjectId string
});

module.exports = {
  loginSchema,
  verify2faSchema,
  setup2faStartSchema,
  setup2faConfirmSchema,
  adminReset2faSchema,
};
