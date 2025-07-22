import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  loginSuperAdmin,
  loginAdmin,
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
  checkAccountStatus,
} from "../middleware/authMiddleware.js";

import {
  paginationSchema,
  loginSchema,
} from "../validations/common.validation.js";
import { checkRole } from "../middleware/authMiddleware.js";
import { Role } from "../generated/prisma/index.js";

const adminRouter = express.Router();

// Unprotected

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

// Protect all below routes
adminRouter.use(authenticate, requireAuth, checkAccountStatus);

const validatePagination = validateRequest({ query: paginationSchema });
const validateAdminId = validateRequest({ params: adminIdParamSchema });
const validateCreateAdmin = validateRequest({ body: adminCreateSchema });
const validateUpdateAdmin = validateRequest({ body: adminUpdateSchema });

// 🔒 SUPERADMIN ONLY

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

// 🔒 SUPERADMIN + ADMIN (self-based enforcement can be added in controller logic)
adminRouter.get(
  "/:adminId",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  asyncHandler(getAdmin)
);
adminRouter.put(
  "/:adminId",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validateUpdateAdmin,
  asyncHandler(updateAdmin)
);

adminRouter.get(
  "/:adminId/users",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminUsers)
);
adminRouter.get(
  "/:adminId/products",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminProducts)
);
adminRouter.get(
  "/:adminId/inventory-logs",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInventoryLogs)
);
adminRouter.get(
  "/:adminId/reports",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminReports)
);
adminRouter.get(
  "/:adminId/invoices",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInvoices)
);
adminRouter.get(
  "/:adminId/inquiries",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminInquiries)
);
adminRouter.get(
  "/:adminId/settings",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  asyncHandler(getAdminSettings)
);
adminRouter.get(
  "/:adminId/orders",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminOrders)
);
adminRouter.get(
  "/:adminId/discounts",
  checkRole([Role.SUPERADMIN, Role.ADMIN]),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminDiscounts)
);

export default adminRouter;
