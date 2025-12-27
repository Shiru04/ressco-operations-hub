const { z } = require("zod");
const { ROLES } = require("../../shared/constants/roles");

const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  role: z.enum(Object.values(ROLES)),
  password: z.string().min(8).max(72),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  isActive: z.boolean().optional(),
});

const enforce2faSchema = z.object({
  enabled: z.boolean(),
});

module.exports = { createUserSchema, updateUserSchema, enforce2faSchema };
