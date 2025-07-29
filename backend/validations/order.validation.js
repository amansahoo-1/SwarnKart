import { z } from "zod";
import { idSchema } from "./common.validation.js";

const MAX_QUANTITY = 100;

export const orderCreateSchema = z
  .object({
    userId: idSchema,
    adminId: idSchema.optional(),
    discountId: idSchema.optional(),
    items: z
      .array(
        z.object({
          productId: idSchema,
          quantity: z.number().int().positive().max(MAX_QUANTITY),
          price: z.number().positive(),
        })
      )
      .min(1, "At least one item is required"),
  })
  .refine(
    async (data) => {
      // Additional async validation can be added here if needed
      return true;
    },
    {
      message: "Custom validation error",
    }
  );

export const orderUpdateSchema = z
  .object({
    status: z
      .enum([
        "PENDING",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ])
      .optional(),
    adminId: idSchema.optional(),
    cancellationReason: z.string().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const orderQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  status: z
    .enum([
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ])
    .optional(),
  userId: idSchema.optional(),
  adminId: idSchema.optional(),
});

export const orderIdParamSchema = z.object({
  orderId: idSchema,
});

export const requestReturnSchema = z.object({});
