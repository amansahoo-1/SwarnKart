import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getInventory,
  getInventoryLogs,
  getInventoryLogById,
  getAdminInventoryLogs,
  getLowStockItems,
  adjustInventory,
  bulkUpdateInventory,
} from "../controllers/inventoryControllers.js";
import {
  inventoryAdjustmentSchema,
  inventoryLogQuerySchema,
  inventoryBulkUpdateSchema,
} from "../validations/inventory.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  checkAccountStatus,
  checkRole,
} from "../middleware/authMiddleware.js";

const inventoryRouter = express.Router();

// Apply core middleware to all inventory routes
inventoryRouter.use(authenticate, checkAccountStatus);

// Inventory management routes
inventoryRouter.get(
  "/product/:productId",
  checkRole(["ADMIN", "SUPERADMIN"]),
  asyncHandler(getInventory)
);

inventoryRouter.post(
  "/adjust",
  checkRole(["ADMIN", "SUPERADMIN"]),
  validateRequest({ body: inventoryAdjustmentSchema }),
  asyncHandler(adjustInventory)
);

inventoryRouter.post(
  "/bulk-update",
  checkRole(["SUPERADMIN"]),
  validateRequest({ body: inventoryBulkUpdateSchema }),
  asyncHandler(bulkUpdateInventory)
);

// Inventory log routes
inventoryRouter.get(
  "/product/:productId/logs",
  checkRole(["ADMIN", "SUPERADMIN"]),
  validateRequest({ query: inventoryLogQuerySchema }),
  asyncHandler(getInventoryLogs)
);

inventoryRouter.get(
  "/logs/:logId",
  checkRole(["ADMIN", "SUPERADMIN"]),
  asyncHandler(getInventoryLogById)
);

inventoryRouter.get(
  "/admin/:adminId/logs",
  checkRole(["ADMIN", "SUPERADMIN"]),
  validateRequest({ query: inventoryLogQuerySchema }),
  asyncHandler(getAdminInventoryLogs)
);

// Inventory reporting routes
inventoryRouter.get(
  "/low-stock",
  checkRole(["ADMIN", "SUPERADMIN"]),
  asyncHandler(getLowStockItems)
);

export default inventoryRouter;
