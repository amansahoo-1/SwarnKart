// validations/inventory.validation.js
import { z } from "zod";
import { idSchema } from "./common.validation.js";

export const inventoryLogCreateSchema = z.object({
  productId: idSchema,
  change: z.number().int(),
  reason: z.string().min(2),
  adminId: idSchema,
});
