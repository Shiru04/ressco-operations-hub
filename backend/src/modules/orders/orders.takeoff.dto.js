const { z } = require("zod");

const takeoffHeaderSchema = z.object({
  customer: z.string().max(120).optional().nullable(),
  jobName: z.string().max(120).optional().nullable(),
  buyer: z.string().max(120).optional().nullable(),
  date: z.string().datetime().optional().nullable(),
  shipTo: z.string().max(200).optional().nullable(),
  poNumber: z.string().max(60).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  jobContactPhone: z.string().max(40).optional().nullable(),
  shipToAddress: z
    .object({
      placeId: z.string().optional().nullable(),
      formatted: z.string().optional().nullable(),
      line1: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      zip: z.string().optional().nullable(),
    })
    .optional(),

  code: z.enum(["SMACNA", "UMC", "Other"]).optional().nullable(),
  insulation: z.string().max(80).optional().nullable(),
  brand: z.string().max(80).optional().nullable(),
  rValue: z.string().max(40).optional().nullable(),

  duct: z
    .object({
      assembled: z.boolean().optional(),
      pitts: z.boolean().optional(),
      snapLock: z.boolean().optional(),
      bead: z.boolean().optional(),
      crossBreak: z.boolean().optional(),
    })
    .optional(),

  stiffening: z.string().max(80).optional().nullable(),
  materialType: z.string().max(80).optional().nullable(),

  pressureClass: z.string().max(60).optional().nullable(),
  endConnectors: z.string().max(80).optional().nullable(),
  sealant: z.string().max(80).optional().nullable(),
  exposed: z.boolean().optional(),
  label: z.boolean().optional(),
  exteriorAngleIron: z.string().max(80).optional().nullable(),
  roofTopDuct: z.enum(["Yes", "No"]).optional().nullable(),
});

const takeoffItemSchema = z.object({
  lineNo: z.number().int().min(0).optional(),
  typeCode: z.string().min(2).max(10),
  qty: z.number().min(0).optional(),
  ga: z.string().max(20).optional().nullable(),
  material: z.string().max(40).optional().nullable(),
  measurements: z
    .record(z.union([z.number(), z.string(), z.null()]))
    .optional(),
  remarks: z.string().max(2000).optional().nullable(),
});

const patchTakeoffSchema = z.object({
  header: takeoffHeaderSchema.optional(),
  items: z.array(takeoffItemSchema).optional(),
});

module.exports = { patchTakeoffSchema };
