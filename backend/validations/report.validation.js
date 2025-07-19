// validations/report.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const reportCreateSchema = z.object({
  title: z.string().min(5),
  adminId: idSchema,
});
