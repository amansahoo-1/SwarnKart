import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getSettings,
  updateSettings,
  getSetting,
  createSetting,
  deleteSetting,
  getSystemSettings,
  updateSystemSetting,
  getPublicSettings,
} from "../controllers/settingsControllers.js";
import {
  settingCreateSchema,
  settingUpdateSchema,
  bulkSettingsUpdateSchema,
  systemSettingSchema,
} from "../validations/setting.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  checkAccountStatus,
  checkRole,
} from "../middleware/authMiddleware.js";
import { Role } from "../generated/prisma/index.js";

const settingsRouter = express.Router();

//───────────────────────────────────────────────────
// Public Routes
//───────────────────────────────────────────────────
settingsRouter.get("/public", asyncHandler(getPublicSettings));

//───────────────────────────────────────────────────
// Authenticated Routes (All require auth)
//───────────────────────────────────────────────────
settingsRouter.use(authenticate, checkAccountStatus);

//───────────────────────────────────────────────────
// Admin Settings Routes
//───────────────────────────────────────────────────

// Get all settings for an admin
settingsRouter.get(
  "/admins/:adminId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(getSettings)
);

// Update multiple settings (bulk update)
settingsRouter.put(
  "/admins/:adminId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateRequest({ body: bulkSettingsUpdateSchema }),
  asyncHandler(updateSettings)
);

// Create a new setting
settingsRouter.post(
  "/admins/:adminId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateRequest({ body: settingCreateSchema }),
  asyncHandler(createSetting)
);

// Get a specific setting by key
settingsRouter.get(
  "/admins/:adminId/:key",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(getSetting)
);

// Delete a specific setting
settingsRouter.delete(
  "/admins/:adminId/:key",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(deleteSetting)
);

//───────────────────────────────────────────────────
// System Settings Routes (SuperAdmin only)
//───────────────────────────────────────────────────
settingsRouter.use(checkRole([Role.SUPERADMIN]));

// Get all system settings
settingsRouter.get("/system", asyncHandler(getSystemSettings));

// Create or update system setting
settingsRouter.post(
  "/system",
  validateRequest({ body: systemSettingSchema }),
  asyncHandler(updateSystemSetting)
);

export default settingsRouter;
