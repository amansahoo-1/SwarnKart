// validations/inquiry.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const inquiryCreateSchema = z.object({
  message: z.string().min(10),
  adminId: idSchema.optional(),
});
