// validations/product.validation.js
import { z } from "zod";
import { idSchema, urlSchema } from "./common.validation.js";

export const productCreateSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
  description: z.string().optional(),
  imageUrl: urlSchema.optional(),
  createdById: idSchema,
});

export const productUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    price: z.number().positive().optional(),
    description: z.string().optional(),
    imageUrl: urlSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
