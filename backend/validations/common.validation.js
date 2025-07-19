// validations/common.validation.js
import { z } from "zod";

export const idSchema = z.number().int().positive();
export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8);
export const phoneSchema = z.string().regex(/^\+?[0-9]{10,15}$/);
export const urlSchema = z.string().url().optional();

export const paginationSchema = z
  .object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).optional(),
  })
  .partial();
