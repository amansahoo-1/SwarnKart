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
  getAdminDashboardStats,
  getAdminProfile,
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

// Reusable validation middlewares
const validatePagination = validateRequest({ query: paginationSchema });
const validateAdminId = validateRequest({ params: adminIdParamSchema });
const validateCreateAdmin = validateRequest({ body: adminCreateSchema });
const validateUpdateAdmin = validateRequest({ body: adminUpdateSchema });

/* ---------------------------- Admin Profile Routes ---------------------------- */
adminRouter.get(
  "/profile",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(getAdminProfile)
);

adminRouter.get(
  "/dashboard",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(getAdminDashboardStats)
);

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

// Admin management
adminRouter.get(
  "/",
  checkRole(sharedRoles),
  validatePagination,
  asyncHandler(getAdmin)
);

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

// Admin resource access
adminRouter.get(
  "/:adminId/users",
  checkRole(sharedRoles),
  validateAdminId,
  validatePagination,
  asyncHandler(getAdminUsers)
);

export default adminRouter;
