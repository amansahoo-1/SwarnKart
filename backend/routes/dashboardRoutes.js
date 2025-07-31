import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getDashboardMetrics,
  getSalesAnalytics,
  exportData,
  getRealtimeUpdates,
} from "../controllers/dashboardControllers.js";
import {
  dashboardFilterSchema,
  dashboardExportSchema,
} from "../validations/dashboard.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  checkAccountStatus,
  checkRole,
} from "../middleware/authMiddleware.js";
import { Role } from "../generated/prisma/index.js";

const dashboardRouter = express.Router();

// All routes require authentication
dashboardRouter.use(
  authenticate,
  checkAccountStatus,
  checkRole([Role.ADMIN, Role.SUPERADMIN])
);

// Dashboard metrics
dashboardRouter.get(
  "/metrics",
  validateRequest({ query: dashboardFilterSchema }),
  asyncHandler(getDashboardMetrics)
);

// Sales analytics
dashboardRouter.get(
  "/sales",
  validateRequest({ query: dashboardFilterSchema }),
  asyncHandler(getSalesAnalytics)
);

// Data export for BI tools
dashboardRouter.post(
  "/export",
  validateRequest({ body: dashboardExportSchema }),
  asyncHandler(exportData)
);

// Realtime updates
dashboardRouter.get("/realtime", asyncHandler(getRealtimeUpdates));

export default dashboardRouter;
