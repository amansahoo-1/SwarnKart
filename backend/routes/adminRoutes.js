import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  loginSuperAdmin,
  loginAdmin,
  getAdmin,
  getAdminById,
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
  checkAccountStatus,
  checkRole,
} from "../middleware/authMiddleware.js";
import {
  paginationSchema,
  loginSchema,
} from "../validations/common.validation.js";

import { Role } from "../generated/prisma/index.js";

const adminRouter = express.Router();

/* ----------------------------- Public Routes ----------------------------- */

adminRouter.post(
  "/login-superadmin",
  validateRequest({ body: loginSchema }),
  asyncHandler(loginSuperAdmin)
);

adminRouter.post(
  "/login",
  validateRequest({ body: loginSchema }),
  asyncHandler(loginAdmin)
);

/* ---------------------------- Protected Routes --------------------------- */

adminRouter.use(authenticate, requireAuth(), checkAccountStatus);

const validatePagination = validateRequest({ query: paginationSchema });
const validateAdminId = validateRequest({ params: adminIdParamSchema });
const validateCreateAdmin = validateRequest({ body: adminCreateSchema });
const validateUpdateAdmin = validateRequest({ body: adminUpdateSchema });

/* ---------------------------- SUPERADMIN ONLY ---------------------------- */

adminRouter.post(
  "/",
  checkRole([Role.SUPERADMIN]),
  validateCreateAdmin,
  asyncHandler(createAdmin)
);

adminRouter.delete(
  "/:adminId",
  checkRole([Role.SUPERADMIN]),
  validateAdminId,
  asyncHandler(deleteAdmin)
);

/* ---------------------- ADMIN + SUPERADMIN SHARED ROUTES ---------------------- */

const sharedRoles = [Role.ADMIN, Role.SUPERADMIN];

// ✅ Fetch all admins — /api/admin
adminRouter.get(
  "/",
  checkRole(sharedRoles),
  validatePagination,
  asyncHandler(getAdmin)
);

// ✅ Fetch single admin by ID — /api/admin/:adminId
adminRouter.get(
  "/:adminId",
  checkRole(sharedRoles),
  validateAdminId,
  asyncHandler(getAdminById)
);

adminRouter.put(
  "/:adminId",
  checkRole(sharedRoles),
  validateAdminId,
  validateUpdateAdmin,
  asyncHandler(updateAdmin)
);

adminRouter.get(
  "/:adminId/users",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminUsers)
);

adminRouter.get(
  "/:adminId/products",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminProducts)
);

adminRouter.get(
  "/:adminId/inventory-logs",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInventoryLogs)
);

adminRouter.get(
  "/:adminId/reports",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminReports)
);

adminRouter.get(
  "/:adminId/invoices",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInvoices)
);

adminRouter.get(
  "/:adminId/inquiries",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInquiries)
);

adminRouter.get(
  "/:adminId/settings",
  checkRole(sharedRoles),
  validateAdminId,
  asyncHandler(getAdminSettings)
);

adminRouter.get(
  "/:adminId/orders",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminOrders)
);

adminRouter.get(
  "/:adminId/discounts",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminDiscounts)
);

export default adminRouter;
