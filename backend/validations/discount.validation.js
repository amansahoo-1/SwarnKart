import { z } from "zod";
import { idSchema } from "./common.validation.js";

// Existing schemas
export const discountCreateSchema = z.object({
  code: z.string().min(3).max(20),
  percentage: z.number().min(1).max(100),
  validTill: z.date().or(z.string().datetime()),
  productIds: z.array(idSchema).optional(),
  userIds: z.array(idSchema).optional(),
});

export const discountUpdateSchema = z.object({
  code: z.string().min(3).max(20).optional(),
  percentage: z.number().min(1).max(100).optional(),
  validTill: z.date().or(z.string().datetime()).optional(),
});

// New schema for cart discount application
export const discountCodeSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i, {
      message:
        "Discount code can only contain letters, numbers, hyphens and underscores",
    }),
});
