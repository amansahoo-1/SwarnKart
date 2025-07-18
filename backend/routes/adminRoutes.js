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

const adminRouter = express.Router();

// Basic admin CRUD routes
adminRouter.get("/", asyncHandler(getAdmins));
adminRouter.post("/", asyncHandler(createAdmin));
adminRouter.get("/:adminId", asyncHandler(getAdmin));
adminRouter.put("/:adminId", asyncHandler(updateAdmin));
adminRouter.delete("/:adminId", asyncHandler(deleteAdmin));

// Admin-related entities routes
adminRouter.get("/:adminId/users", asyncHandler(getAdminUsers));
adminRouter.get("/:adminId/products", asyncHandler(getAdminProducts));
adminRouter.get(
  "/:adminId/inventory-logs",
  asyncHandler(getAdminInventoryLogs)
);
adminRouter.get("/:adminId/reports", asyncHandler(getAdminReports));
adminRouter.get("/:adminId/invoices", asyncHandler(getAdminInvoices));
adminRouter.get("/:adminId/inquiries", asyncHandler(getAdminInquiries));
adminRouter.get("/:adminId/settings", asyncHandler(getAdminSettings));
adminRouter.get("/:adminId/orders", asyncHandler(getAdminOrders));
adminRouter.get("/:adminId/discounts", asyncHandler(getAdminDiscounts));

export default adminRouter;
