// validations/wishlist.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const wishlistItemSchema = z.object({
  productId: idSchema,
});
