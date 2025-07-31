// validations/common.validation.js
import { z } from "zod";

export const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .describe("Positive integer ID (autoincremented)");

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8);
export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/)
  .optional();
export const urlSchema = z.string().url().optional();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).optional(),
  })
  .partial();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
