// validations/invoice.validation.js
import { date, z } from "zod";
import { idSchema, urlSchema } from "./common.validation.js";

export const invoiceCreateSchema = z.object({
  orderId: idSchema,
  pdfUrl: urlSchema,
  adminId: idSchema,
  createdAt: date().optional(),
});
