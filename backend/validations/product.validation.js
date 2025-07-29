import { z } from "zod";
import { idSchema } from "./common.validation.js";

const MAX_PRICE = 1000000;
const MAX_DESCRIPTION_LENGTH = 2000;

// Define URL schema with image format validation here
const imageUrlSchema = z
  .string()
  .url()
  .regex(/\.(jpeg|jpg|png|webp)$/i, {
    message: "Image URL must end with .jpeg, .jpg, .png, or .webp",
  });

export const productCreateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  price: z
    .number()
    .positive("Price must be positive")
    .max(MAX_PRICE, `Price cannot exceed ${MAX_PRICE}`),
  description: z
    .string()
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`
    )
    .optional(),
  imageUrl: imageUrlSchema.optional(),
  adminId: idSchema,
  categoryId: idSchema.optional(),
});

export const productUpdateSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    price: z.number().positive().max(MAX_PRICE).optional(),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
    imageUrl: imageUrlSchema.optional(),
    categoryId: idSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
    path: ["body"],
  });

export const productQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  search: z.string().max(100).optional(),
  categoryId: idSchema.optional(),
});

export const categoryProductsQuerySchema = productQuerySchema.extend({
  includeSubcategories: z.boolean().default(false),
});

export const productIdParamSchema = z.object({
  productId: idSchema,
});
