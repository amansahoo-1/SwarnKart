// validations/discount.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const discountCreateSchema = z.object({
  code: z.string().min(3).max(20),
  percentage: z.number().min(1).max(100),
  validTill: z.coerce.date().min(new Date()),
  userIds: z.array(idSchema).optional(),
});

export const discountUpdateSchema = z
  .object({
    code: z.string().min(3).max(20).optional(),
    percentage: z.number().min(1).max(100).optional(),
    validTill: z.coerce.date().min(new Date()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
