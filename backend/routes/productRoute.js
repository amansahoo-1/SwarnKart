import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productControllers.js";
import {
  productCreateSchema,
  productUpdateSchema,
  productIdParamSchema,
  productQuerySchema,
} from "../validations/product.validation.js";
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

const productRouter = express.Router();

// Pre-validated middleware
const validateProductId = validateRequest({ params: productIdParamSchema });
const validateCreate = validateRequest({ body: productCreateSchema });
const validateUpdate = validateRequest({ body: productUpdateSchema });
const validateProductQuery = validateRequest({ query: productQuerySchema });

//───────────────────────────────────────────────────
// Public Routes (No Authentication Required)
//───────────────────────────────────────────────────
productRouter.get("/", validateProductQuery, asyncHandler(getProducts));
productRouter.get(
  "/:productId",
  validateProductId,
  asyncHandler(getProductById)
);

//───────────────────────────────────────────────────
// Authenticated Routes (All Below Require Auth)
//───────────────────────────────────────────────────
productRouter.use(authenticate, checkAccountStatus);

// Admin-only routes
productRouter.post(
  "/",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateCreate,
  asyncHandler(createProduct)
);

productRouter.put(
  "/:productId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateProductId,
  validateUpdate,
  asyncHandler(updateProduct)
);

productRouter.delete(
  "/:productId",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateProductId,
  asyncHandler(deleteProduct)
);

export default productRouter;
