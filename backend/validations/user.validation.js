// validations/user.validation.js
import { z } from "zod";
import {
  idSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  urlSchema,
} from "./common.validation.js";

// User schemas
export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  address: z.string().optional(),
  preferences: z.record(z.any()).optional(),
  adminId: idSchema.optional(),
});

export const userUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema,
    address: z.string().optional(),
    preferences: z.record(z.any()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const userIdParamSchema = z.object({
  userId: idSchema,
});

// Cart schemas
export const cartItemSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().positive(),
});

export const cartUpdateSchema = z.object({
  items: z.array(cartItemSchema),
});

// Wishlist schemas
export const wishlistItemSchema = z.object({
  productId: idSchema,
  action: z.enum(["add", "remove"]),
});

// Review schemas
export const reviewCreateSchema = z.object({
  productId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).optional(),
});

// Discount schemas
export const discountCodeSchema = z.object({
  discountCode: z.string().min(3).max(20),
});

// Pagination schema (re-exported from common)
export { paginationSchema } from "./common.validation.js";
