import { z } from "zod";

export const dashboardFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  interval: z
    .enum(["hourly", "daily", "weekly", "monthly", "yearly"])
    .optional(),
  adminId: z.number().int().positive().optional(),
  productId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(1000).optional().default(100),
  format: z.enum(["json", "csv", "excel"]).optional().default("json"),
});

export const dashboardExportSchema = z.object({
  type: z.enum(["orders", "products", "users", "inventory"]),
  filters: dashboardFilterSchema.optional(),
});
