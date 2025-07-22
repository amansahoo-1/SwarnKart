// routes/productRoutes.js
import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductReviews,
  getProductInventory,
  updateProductInventory,
} from "../controllers/productControllers.js";
import {
  productCreateSchema,
  productUpdateSchema,
  productIdParamSchema,
  inventoryUpdateSchema,
  paginationSchema,
} from "../validations/product.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  requireAuth,
  requireAdmin,
  requireRole,
  checkAccountStatus,
} from "../middleware/authMiddleware.js";

const productRouter = express.Router();

// Validation middleware
const validatePagination = validateRequest({ query: paginationSchema });
const validateProductId = validateRequest({ params: productIdParamSchema });
const validateCreateProduct = validateRequest({ body: productCreateSchema });
const validateUpdateProduct = validateRequest({ body: productUpdateSchema });
const validateInventoryUpdate = validateRequest({
  body: inventoryUpdateSchema,
});

// Public routes (no authentication required)
productRouter.get("/", validatePagination, asyncHandler(getProducts));
productRouter.get(
  "/:productId",
  validateProductId,
  asyncHandler(getProductById)
);
productRouter.get(
  "/:productId/reviews",
  validateProductId,
  validatePagination,
  asyncHandler(getProductReviews)
);

// Authenticated routes
productRouter.use(authenticate);

// Inventory routes (admin/managers only)
productRouter.get(
  "/:productId/inventory",
  requireRole("SUPERADMIN", "MANAGER"),
  validateProductId,
  asyncHandler(getProductInventory)
);

productRouter.put(
  "/:productId/inventory",
  requireRole("SUPERADMIN", "MANAGER"),
  validateProductId,
  validateInventoryUpdate,
  asyncHandler(updateProductInventory)
);

// Admin-only product management routes
productRouter.post(
  "/",
  requireAdmin,
  validateCreateProduct,
  asyncHandler(createProduct)
);

productRouter.put(
  "/:productId",
  requireAdmin,
  validateProductId,
  validateUpdateProduct,
  asyncHandler(updateProduct)
);

productRouter.delete(
  "/:productId",
  requireRole("SUPERADMIN"), // Only superadmin can delete products
  validateProductId,
  asyncHandler(deleteProduct)
);

export default productRouter;
