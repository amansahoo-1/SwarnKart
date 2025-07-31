import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createDiscount,
  getDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  applyDiscountToProduct,
  removeDiscountFromProduct,
  getProductDiscounts,
  getValidProductDiscounts,
} from "../controllers/discountControllers.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  checkAccountStatus,
  checkRole,
} from "../middleware/authMiddleware.js";
import { Role } from "../generated/prisma/index.js";
import {
  discountCreateSchema,
  discountUpdateSchema,
} from "../validations/discount.validation.js";

const discountRouter = express.Router();

// Apply core middleware to all discount routes
discountRouter.use(authenticate, checkAccountStatus);

//───────────────────────────────────────────────────
// Discount CRUD Routes (Admin only)
//───────────────────────────────────────────────────
discountRouter.post(
  "/",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateRequest({ body: discountCreateSchema }),
  asyncHandler(createDiscount)
);

discountRouter.get(
  "/",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(getDiscounts)
);

discountRouter.get(
  "/:discountId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(getDiscountById)
);

discountRouter.patch(
  "/:discountId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateRequest({ body: discountUpdateSchema }),
  asyncHandler(updateDiscount)
);

discountRouter.delete(
  "/:discountId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(deleteDiscount)
);

//───────────────────────────────────────────────────
// Product-Discount Relationship Routes
//───────────────────────────────────────────────────
discountRouter.post(
  "/:discountId/products/:productId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(applyDiscountToProduct)
);

discountRouter.delete(
  "/:discountId/products/:productId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  asyncHandler(removeDiscountFromProduct)
);

discountRouter.get("/products/:productId", asyncHandler(getProductDiscounts));

discountRouter.get(
  "/products/:productId/valid",
  asyncHandler(getValidProductDiscounts)
);

export default discountRouter;
