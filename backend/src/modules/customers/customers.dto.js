const { z } = require("zod");

const priorityEnum = z.enum(["low", "normal", "high", "critical"]);

const addressSchema = z
  .object({
    line1: z.string().max(120).optional().nullable(),
    line2: z.string().max(120).optional().nullable(),
    city: z.string().max(80).optional().nullable(),
    state: z.string().max(40).optional().nullable(),
    zip: z.string().max(20).optional().nullable(),
    country: z.string().max(60).optional().nullable(),
  })
  .optional();

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  title: z.string().max(80).optional().nullable(),
});

const createCustomerSchema = z.object({
  name: z.string().min(2).max(120),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  contacts: z.array(contactSchema).optional(),
  sla: z
    .object({
      hoursTarget: z
        .number()
        .int()
        .min(1)
        .max(24 * 365)
        .optional(),
      priority: priorityEnum.optional(),
    })
    .optional(),
  notes: z.string().max(5000).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

module.exports = { createCustomerSchema, updateCustomerSchema };
