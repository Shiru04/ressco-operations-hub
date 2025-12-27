const { z } = require("zod");
const { ORDER_STATUSES } = require("../../shared/constants/orderStatuses");

const priorityEnum = z.enum(["low", "normal", "high", "critical"]);
const sourceEnum = z.enum(["pos", "website", "internal"]);
const statusEnum = z.enum(Object.values(ORDER_STATUSES));

const contactSnapshotSchema = z.object({
  name: z.string().max(80).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
});

const estimateSchema = z.object({
  laborHours: z.number().min(0).optional(),
  laborRate: z.number().min(0).optional(),
  materialsCost: z.number().min(0).optional(),
  overheadPct: z.number().min(0).max(100).optional(),
});

const itemSchema = z.object({
  description: z.string().min(2).max(200),
  qty: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

const createOrderSchema = z.object({
  source: sourceEnum,
  customerId: z.string().min(5),
  contactSnapshot: contactSnapshotSchema.optional(),
  priority: priorityEnum.optional(),
  sla: z
    .object({
      hoursTarget: z
        .number()
        .int()
        .min(1)
        .max(24 * 365)
        .optional(),
      dueAt: z.string().datetime().optional(),
    })
    .optional(),
  estimate: estimateSchema.optional(),
  items: z.array(itemSchema).optional(),
  notes: z.string().max(5000).optional(),
});

/**
 * Website intake: keep it strict and minimal.
 * Customer linkage can be direct by customerId OR by name/email if you later add lookup;
 * For v1, require customerId to avoid ambiguity.
 */
const intakeOrderSchema = z.object({
  customerId: z.string().min(5),
  contactSnapshot: contactSnapshotSchema.optional(),
  items: z.array(itemSchema).min(1),
  notes: z.string().max(5000).optional(),
});

const updateOrderSchema = z.object({
  priority: priorityEnum.optional(),
  sla: z
    .object({
      hoursTarget: z
        .number()
        .int()
        .min(1)
        .max(24 * 365)
        .optional(),
      dueAt: z.string().datetime().optional().nullable(),
    })
    .optional(),
  estimate: estimateSchema.optional(),
  items: z.array(itemSchema).optional(),
  notes: z.string().max(5000).optional(),
});

const patchStatusSchema = z.object({
  status: statusEnum,
  note: z.string().max(2000).optional(),
});

module.exports = {
  createOrderSchema,
  intakeOrderSchema,
  updateOrderSchema,
  patchStatusSchema,
};
