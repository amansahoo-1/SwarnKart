// validations/cart.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const cartItemSchema = z.object({
  productId: idSchema,
  quantity: z.number().int().positive(),
});

export const cartUpdateSchema = z.object({
  items: z.array(cartItemSchema),
});
