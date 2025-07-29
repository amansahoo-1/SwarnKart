import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const inventoryAdjustmentSchema = z.object({
  productId: idSchema,
  change: z
    .number()
    .int()
    .refine((val) => val !== 0, {
      message: "Change must be positive or negative integer",
    }),
  reason: z.string().min(2).max(500),
  adminId: idSchema,
});

export const inventoryLogQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["newest", "oldest"]).default("newest"),
});

export const inventoryBulkUpdateSchema = z.object({
  adjustments: z
    .array(
      z.object({
        productId: idSchema,
        change: z
          .number()
          .int()
          .refine((val) => val !== 0, {
            message: "Change must be positive or negative integer",
          }),
        reason: z.string().min(2).max(500),
      })
    )
    .min(1, "At least one adjustment is required"),
  adminId: idSchema,
});

export const inventoryIdParamSchema = z.object({
  productId: idSchema,
});

export const logIdParamSchema = z.object({
  logId: idSchema,
});

export const adminIdParamSchema = z.object({
  adminId: idSchema,
});
