import { z } from "zod";
import { idSchema } from "./common.validation.js";

// Schema for wishlist item operations
export const wishlistItemActionSchema = z.object({
  productId: idSchema,
  action: z.enum(["add", "remove"]),
});

// Schema for checking if product is in wishlist
export const wishlistContainsSchema = z.object({
  userId: idSchema,
  productId: idSchema,
});

// Schema for moving items to cart
export const moveToCartSchema = z.object({
  clearAfterMove: z.boolean().optional().default(false),
});

// Schema for wishlist response
export const wishlistResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.number().nullable(),
    userId: z.number(),
    wishlistItems: z.array(
      z.object({
        id: z.number(),
        product: z.object({
          id: z.number(),
          name: z.string(),
          price: z.number(),
          imageUrl: z.string().nullable(),
          description: z.string().nullable(),
          createdAt: z.date(),
        }),
        addedAt: z.date(),
      })
    ),
  }),
  count: z.number(),
});
