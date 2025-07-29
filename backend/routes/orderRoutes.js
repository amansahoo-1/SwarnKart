import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createOrder,
  getOrderHistory,
  getOrderById,
  updateOrderStatus,
  getAdminOrders,
  cancelOrder,
  requestReturn,
} from "../controllers/orderControllers.js";
import {
  orderCreateSchema,
  orderUpdateSchema,
  orderQuerySchema,
  orderIdParamSchema,
  requestReturnSchema,
} from "../validations/order.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  checkAccountStatus,
  checkRole,
  authorizeUserAccess,
} from "../middleware/authMiddleware.js";
import { Role } from "../generated/prisma/index.js";

const orderRouter = express.Router();

// Pre-validated middleware
const validateOrderId = validateRequest({ params: orderIdParamSchema });
const validateCreate = validateRequest({ body: orderCreateSchema });
const validateUpdate = validateRequest({ body: orderUpdateSchema });
const validateQuery = validateRequest({ query: orderQuerySchema });
const validateReturnRequest = validateRequest({ body: requestReturnSchema });

//───────────────────────────────────────────────────
// Authenticated Routes (All require auth)
//───────────────────────────────────────────────────
orderRouter.use(authenticate, checkAccountStatus);

//───────────────────────────────────────────────────
// User Routes
//───────────────────────────────────────────────────
orderRouter.post(
  "/",
  checkRole([Role.USER]),
  validateCreate,
  asyncHandler(createOrder)
);

orderRouter.get(
  "/user/:userId",
  checkRole([Role.USER]),
  authorizeUserAccess,
  validateQuery,
  asyncHandler(getOrderHistory)
);

orderRouter.get(
  "/:orderId",
  checkRole([Role.USER, Role.ADMIN, Role.SUPERADMIN]),
  validateOrderId,
  asyncHandler(getOrderById)
);

orderRouter.patch(
  "/:orderId/cancel",
  checkRole([Role.USER]),
  validateOrderId,
  asyncHandler(cancelOrder)
);

orderRouter.post(
  "/:orderId/return",
  checkRole([Role.USER]),
  validateOrderId,
  validateReturnRequest,
  asyncHandler(requestReturn)
);

//───────────────────────────────────────────────────
// Admin Routes
//───────────────────────────────────────────────────
orderRouter.use(checkRole([Role.ADMIN, Role.SUPERADMIN]));

orderRouter.get("/admin/:adminId", validateQuery, asyncHandler(getAdminOrders));

orderRouter.patch(
  "/:orderId/status",
  validateOrderId,
  validateUpdate,
  asyncHandler(updateOrderStatus)
);

export default orderRouter;
