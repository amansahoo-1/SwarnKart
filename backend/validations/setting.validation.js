// validations/setting.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const settingCreateSchema = z.object({
  key: z.string().min(2),
  value: z.string().min(1),
  adminId: idSchema.optional(),
});

export const settingUpdateSchema = z.object({
  value: z.string().min(1),
});
