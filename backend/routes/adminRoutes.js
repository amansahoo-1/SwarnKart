// routes/adminRoutes.js
import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getAdmins,
  getAdmin,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAdminUsers,
  getAdminProducts,
  getAdminInventoryLogs,
  getAdminReports,
  getAdminInvoices,
  getAdminInquiries,
  getAdminSettings,
  getAdminOrders,
  getAdminDiscounts,
} from "../controllers/adminControllers.js";
import {
  adminCreateSchema,
  adminUpdateSchema,
  adminIdParamSchema,
} from "../validations/admin.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
  requireRole,
  checkAccountStatus,
} from "../middleware/authMiddleware.js";
import { paginationSchema } from "../validations/common.validation.js";

const adminRouter = express.Router();

// Apply authentication and account status check to all admin routes
adminRouter.use(authenticate, requireAuth, checkAccountStatus);

// Validation middleware
const validatePagination = validateRequest({ query: paginationSchema });
const validateAdminId = validateRequest({ params: adminIdParamSchema });
const validateCreateAdmin = validateRequest({ body: adminCreateSchema });
const validateUpdateAdmin = validateRequest({ body: adminUpdateSchema });

// Basic admin CRUD routes
adminRouter.get(
  "/",
  requireRole("SUPERADMIN", "MANAGER"),
  validatePagination,
  asyncHandler(getAdmins)
);

adminRouter.post(
  "/",
  requireSuperAdmin,
  validateCreateAdmin,
  asyncHandler(createAdmin)
);

adminRouter.get(
  "/:adminId",
  requireAdmin,
  validateAdminId,
  asyncHandler(getAdmin)
);

adminRouter.put(
  "/:adminId",
  requireAdmin,
  validateAdminId,
  validateUpdateAdmin,
  asyncHandler(updateAdmin)
);

adminRouter.delete(
  "/:adminId",
  requireSuperAdmin,
  validateAdminId,
  asyncHandler(deleteAdmin)
);

// Admin-related entities routes with role-based access
adminRouter.get(
  "/:adminId/users",
  requireRole("SUPERADMIN", "MANAGER"),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminUsers)
);

adminRouter.get(
  "/:adminId/products",
  requireAdmin,
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminProducts)
);

adminRouter.get(
  "/:adminId/inventory-logs",
  requireRole("SUPERADMIN", "MANAGER"),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInventoryLogs)
);

adminRouter.get(
  "/:adminId/reports",
  requireAdmin,
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminReports)
);

adminRouter.get(
  "/:adminId/invoices",
  requireRole("SUPERADMIN", "MANAGER", "SUPPORT"),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInvoices)
);

adminRouter.get(
  "/:adminId/inquiries",
  requireRole("SUPERADMIN", "SUPPORT"),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInquiries)
);

adminRouter.get(
  "/:adminId/settings",
  requireSuperAdmin,
  validateAdminId,
  asyncHandler(getAdminSettings)
);

adminRouter.get(
  "/:adminId/orders",
  requireRole("SUPERADMIN", "MANAGER", "SUPPORT"),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminOrders)
);

adminRouter.get(
  "/:adminId/discounts",
  requireRole("SUPERADMIN", "MANAGER"),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminDiscounts)
);

export default adminRouter;
