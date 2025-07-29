import { z } from "zod";
import { idSchema } from "./common.validation.js";

// Common setting constraints
const KEY_MIN_LENGTH = 2;
const KEY_MAX_LENGTH = 50;
const VALUE_MAX_LENGTH = 500;

export const settingKeySchema = z
  .string()
  .min(KEY_MIN_LENGTH)
  .max(KEY_MAX_LENGTH)
  .regex(/^[a-zA-Z0-9_-]+$/, {
    message: "Key can only contain letters, numbers, underscores and hyphens",
  });

export const settingValueSchema = z.string().min(1).max(VALUE_MAX_LENGTH);

export const settingCreateSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
  adminId: idSchema.optional(),
});

export const settingUpdateSchema = z.object({
  value: settingValueSchema,
});

export const bulkSettingsUpdateSchema = z.record(
  settingKeySchema,
  settingValueSchema
);

export const systemSettingSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
  isPublic: z.boolean().optional(),
  description: z.string().max(200).optional(),
});
