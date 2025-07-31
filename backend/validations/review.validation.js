import { z } from "zod";
import { idSchema } from "./common.validation.js";

const MAX_REVIEW_COMMENT_LENGTH = 500;

export const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  minRating: z.coerce.number().min(1).max(5).optional(),
  maxRating: z.coerce.number().min(1).max(5).optional(),
  sortBy: z
    .enum(["newest", "oldest", "highest", "lowest", "mostHelpful"])
    .default("newest"),
  userId: idSchema.optional(),
  productId: idSchema.optional(),
});

export const reviewCreateSchema = z.object({
  productId: idSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(MAX_REVIEW_COMMENT_LENGTH).optional(),
});

export const reviewUpdateSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(MAX_REVIEW_COMMENT_LENGTH).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const reviewIdParamSchema = z.object({
  id: idSchema,
});
