import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  settingCreateSchema,
  settingUpdateSchema,
  bulkSettingsUpdateSchema,
  systemSettingSchema,
} from "../validations/setting.validation.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";
import { Role } from "../generated/prisma/index.js";

/**
 * @desc    Get all settings for an admin
 * @route   GET /api/admins/:adminId/settings
 * @access  Private/Admin
 */
export const getSettings = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const requestingAdminId = req.user.id;
  const requestingAdminRole = req.user.role;

  // Authorization check
  if (
    parseInt(adminId) !== requestingAdminId &&
    requestingAdminRole !== Role.SUPERADMIN
  ) {
    return errorResponse(res, "Not authorized to access these settings", 403);
  }

  // Verify admin exists
  const adminExists = await prisma.admin.findUnique({
    where: { id: parseInt(adminId) },
  });
  if (!adminExists) {
    return errorResponse(res, "Admin not found", 404);
  }

  const settings = await prisma.setting.findMany({
    where: { adminId: parseInt(adminId) },
    select: {
      id: true,
      key: true,
      value: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { key: "asc" },
  });

  return successResponse(
    res,
    {
      data: settings,
      count: settings.length,
    },
    "Settings retrieved successfully"
  );
});

/**
 * @desc    Update multiple settings for an admin
 * @route   PUT /api/admins/:adminId/settings
 * @access  Private/Admin
 */
export const updateSettings = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const settings = bulkSettingsUpdateSchema.parse(req.body);
  const requestingAdminId = req.user.id;
  const requestingAdminRole = req.user.role;

  // Authorization check
  if (
    parseInt(adminId) !== requestingAdminId &&
    requestingAdminRole !== Role.SUPERADMIN
  ) {
    return errorResponse(res, "Not authorized to update these settings", 403);
  }

  // Verify admin exists
  const adminExists = await prisma.admin.findUnique({
    where: { id: parseInt(adminId) },
  });
  if (!adminExists) {
    return errorResponse(res, "Admin not found", 404);
  }

  // Prepare operations for transaction
  const operations = Object.entries(settings).map(([key, value]) => {
    return prisma.setting.upsert({
      where: {
        adminId_key: {
          adminId: parseInt(adminId),
          key,
        },
      },
      create: {
        adminId: parseInt(adminId),
        key,
        value: String(value),
      },
      update: {
        value: String(value),
      },
    });
  });

  // Execute transaction
  const updatedSettings = await prisma.$transaction(operations);

  // Audit log
  if (updatedSettings.length > 0) {
    await prisma.auditLog.create({
      data: {
        action: "SETTINGS_UPDATE",
        entityType: "SETTINGS",
        entityId: `admin-${adminId}`,
        adminId: requestingAdminId,
        details: `Updated ${updatedSettings.length} settings`,
      },
    });
  }

  return successResponse(
    res,
    {
      updatedCount: updatedSettings.length,
      data: updatedSettings,
    },
    "Settings updated successfully"
  );
});

/**
 * @desc    Get a specific setting by key
 * @route   GET /api/admins/:adminId/settings/:key
 * @access  Private/Admin
 */
export const getSetting = asyncHandler(async (req, res) => {
  const { adminId, key } = req.params;
  const requestingAdminId = req.user.id;
  const requestingAdminRole = req.user.role;

  // Authorization check
  if (
    parseInt(adminId) !== requestingAdminId &&
    requestingAdminRole !== Role.SUPERADMIN
  ) {
    return errorResponse(res, "Not authorized to access this setting", 403);
  }

  const setting = await prisma.setting.findUnique({
    where: {
      adminId_key: {
        adminId: parseInt(adminId),
        key,
      },
    },
  });

  if (!setting) {
    return errorResponse(res, "Setting not found", 404);
  }

  return successResponse(res, setting, "Setting retrieved successfully");
});

/**
 * @desc    Create or update a single setting
 * @route   POST /api/admins/:adminId/settings
 * @access  Private/Admin
 */
export const createSetting = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { key, value } = settingCreateSchema.parse(req.body);
  const requestingAdminId = req.user.id;
  const requestingAdminRole = req.user.role;

  // Authorization check
  if (
    parseInt(adminId) !== requestingAdminId &&
    requestingAdminRole !== Role.SUPERADMIN
  ) {
    return errorResponse(res, "Not authorized to create this setting", 403);
  }

  // Verify admin exists
  const adminExists = await prisma.admin.findUnique({
    where: { id: parseInt(adminId) },
  });
  if (!adminExists) {
    return errorResponse(res, "Admin not found", 404);
  }

  const setting = await prisma.setting.upsert({
    where: {
      adminId_key: {
        adminId: parseInt(adminId),
        key,
      },
    },
    create: {
      adminId: parseInt(adminId),
      key,
      value,
    },
    update: {
      value,
    },
  });

  return successResponse(
    res,
    setting,
    "Setting created/updated successfully",
    201
  );
});

/**
 * @desc    Delete a specific setting
 * @route   DELETE /api/admins/:adminId/settings/:key
 * @access  Private/Admin
 */
export const deleteSetting = asyncHandler(async (req, res) => {
  const { adminId, key } = req.params;
  const requestingAdminId = req.user.id;
  const requestingAdminRole = req.user.role;

  // Authorization check
  if (
    parseInt(adminId) !== requestingAdminId &&
    requestingAdminRole !== Role.SUPERADMIN
  ) {
    return errorResponse(res, "Not authorized to delete this setting", 403);
  }

  const setting = await prisma.setting.findUnique({
    where: {
      adminId_key: {
        adminId: parseInt(adminId),
        key,
      },
    },
  });

  if (!setting) {
    return errorResponse(res, "Setting not found", 404);
  }

  await prisma.setting.delete({
    where: {
      adminId_key: {
        adminId: parseInt(adminId),
        key,
      },
    },
  });

  return successResponse(res, null, "Setting deleted successfully", 204);
});

/**
 * @desc    Get system-wide settings
 * @route   GET /api/settings/system
 * @access  Private/SuperAdmin
 */
export const getSystemSettings = asyncHandler(async (req, res) => {
  if (req.user.role !== Role.SUPERADMIN) {
    return errorResponse(res, "Not authorized as superadmin", 403);
  }

  const settings = await prisma.setting.findMany({
    where: { adminId: null },
    orderBy: { key: "asc" },
  });

  return successResponse(
    res,
    {
      data: settings,
      count: settings.length,
    },
    "System settings retrieved"
  );
});

/**
 * @desc    Create or update system setting
 * @route   POST /api/settings/system
 * @access  Private/SuperAdmin
 */
export const updateSystemSetting = asyncHandler(async (req, res) => {
  if (req.user.role !== Role.SUPERADMIN) {
    return errorResponse(res, "Not authorized as superadmin", 403);
  }

  const { key, value, isPublic, description } = systemSettingSchema.parse(
    req.body
  );

  const setting = await prisma.setting.upsert({
    where: {
      adminId_key: {
        adminId: null,
        key,
      },
    },
    create: {
      key,
      value,
      isPublic: isPublic || false,
      description: description || null,
      adminId: null,
    },
    update: {
      value,
      isPublic,
      description,
    },
  });

  return successResponse(
    res,
    setting,
    "System setting updated successfully",
    201
  );
});

/**
 * @desc    Get public system settings
 * @route   GET /api/settings/public
 * @access  Public
 */
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.setting.findMany({
    where: {
      adminId: null,
      isPublic: true,
    },
    select: {
      key: true,
      value: true,
      description: true,
    },
    orderBy: { key: "asc" },
  });

  const settingsObject = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  return successResponse(
    res,
    settingsObject,
    "Public settings retrieved successfully"
  );
});
