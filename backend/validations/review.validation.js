// validations/review.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const reviewCreateSchema = z.object({
  productId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).optional(),
  userId: idSchema,
});
