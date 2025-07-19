// validations/order.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const orderCreateSchema = z.object({
  status: z.string().min(2),
  userId: idSchema,
  adminId: idSchema.optional(),
  discountId: idSchema.optional(),
  items: z
    .array(
      z.object({
        productId: idSchema,
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1),
});

export const orderUpdateSchema = z
  .object({
    status: z.string().min(2).optional(),
    adminId: idSchema.optional(),
    discountId: idSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
