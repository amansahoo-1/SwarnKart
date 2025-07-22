// validations/admin.validation.js
import { z } from "zod";
import { Role } from "../generated/prisma/index.js";
import { Status } from "../generated/prisma/index.js";
import {
  idSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  urlSchema,
} from "./common.validation.js";

export const adminCreateSchema = z.object({
  name: z.string().min(2),
  email: emailSchema,
  password: passwordSchema,
  phoneNumber: phoneSchema,
  avatarUrl: urlSchema.optional(),
  role: z.nativeEnum(Role),
});

export const adminUpdateSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: emailSchema.optional(),
    phoneNumber: phoneSchema,
    avatarUrl: urlSchema.optional(),
    status: z.nativeEnum(Status).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const adminIdParamSchema = z.object({
  adminId: idSchema,
});
