import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getCart,
  updateCart,
  addCartItem,
  removeCartItem,
  clearCart,
  getCartItemCount,
  applyDiscount,
} from "../controllers/cartControllers.js";
import {
  cartItemSchema,
  cartUpdateSchema,
} from "../validations/cart.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  requireAuth,
  checkAccountStatus,
  authorizeUserAccess,
} from "../middleware/authMiddleware.js";
import { Role } from "../generated/prisma/index.js";
import { discountCodeSchema } from "../validations/discount.validation.js";

const cartRouter = express.Router();

// Apply authentication middleware to all cart routes
cartRouter.use(authenticate, checkAccountStatus);

//───────────────────────────────────────────────────
// Cart Routes (User-specific)
//───────────────────────────────────────────────────
cartRouter.get(
  "/:userId",
  requireAuth([Role.USER]),
  authorizeUserAccess,
  asyncHandler(getCart)
);

cartRouter.get(
  "/:userId/count",
  requireAuth([Role.USER]),
  authorizeUserAccess,
  asyncHandler(getCartItemCount)
);

cartRouter.put(
  "/:userId",
  requireAuth([Role.USER]),
  authorizeUserAccess,
  validateRequest({ body: cartUpdateSchema }),
  asyncHandler(updateCart)
);

cartRouter.post(
  "/:userId/items",
  requireAuth([Role.USER]),
  authorizeUserAccess,
  validateRequest({ body: cartItemSchema }),
  asyncHandler(addCartItem)
);

cartRouter.delete(
  "/:userId/items/:productId",
  requireAuth([Role.USER]),
  authorizeUserAccess,
  asyncHandler(removeCartItem)
);

cartRouter.delete(
  "/:userId/clear",
  requireAuth([Role.USER]),
  authorizeUserAccess,
  asyncHandler(clearCart)
);

cartRouter.post(
  "/:userId/apply-discount",
  requireAuth([Role.USER]),
  authorizeUserAccess,
  validateRequest({ body: discountCodeSchema }),
  asyncHandler(applyDiscount)
);

export default cartRouter;
