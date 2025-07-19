// routes/userRoutes.js
import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getCart,
  updateCart,
  getWishlist,
  updateWishlist,
  getOrders,
  getReviews,
  createReview,
  getDiscounts,
  addDiscount,
} from "../controllers/userControllers.js";
import {
  userCreateSchema,
  userUpdateSchema,
  userIdParamSchema,
  cartUpdateSchema,
  wishlistItemSchema,
  reviewCreateSchema,
  discountCodeSchema,
  paginationSchema,
} from "../validations/user.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  requireAuth,
  checkAccountStatus,
  authorizeUserAccess,
  requireRole,
} from "../middleware/authMiddleware.js";

const userRouter = express.Router();

// Apply authentication to all user routes except create
userRouter.use(authenticate);

// Validation middleware
const validatePagination = validateRequest({ query: paginationSchema });
const validateUserId = validateRequest({ params: userIdParamSchema });
const validateCreateUser = validateRequest({ body: userCreateSchema });
const validateUpdateUser = validateRequest({ body: userUpdateSchema });
const validateCartUpdate = validateRequest({ body: cartUpdateSchema });
const validateWishlistUpdate = validateRequest({ body: wishlistItemSchema });
const validateReviewCreate = validateRequest({ body: reviewCreateSchema });
const validateDiscountCode = validateRequest({ body: discountCodeSchema });

// Public routes (no authentication required)
userRouter.post("/", validateCreateUser, asyncHandler(createUser));

// Protected routes (require authentication)
userRouter.use(requireAuth, checkAccountStatus);

// Basic CRUD routes with authorization
userRouter.get(
  "/",
  requireRole("SUPERADMIN", "MANAGER"), // Only admins can list all users
  validatePagination,
  asyncHandler(getUsers)
);

userRouter.get(
  "/:userId",
  authorizeUserAccess, // Users can only access their own data
  validateUserId,
  asyncHandler(getUserById)
);

userRouter.put(
  "/:userId",
  authorizeUserAccess,
  validateUserId,
  validateUpdateUser,
  asyncHandler(updateUser)
);

userRouter.delete(
  "/:userId",
  authorizeUserAccess,
  validateUserId,
  asyncHandler(deleteUser)
);

// Cart routes (user-specific)
userRouter.get(
  "/:userId/cart",
  authorizeUserAccess,
  validateUserId,
  asyncHandler(getCart)
);

userRouter.put(
  "/:userId/cart",
  authorizeUserAccess,
  validateUserId,
  validateCartUpdate,
  asyncHandler(updateCart)
);

// Wishlist routes (user-specific)
userRouter.get(
  "/:userId/wishlist",
  authorizeUserAccess,
  validateUserId,
  asyncHandler(getWishlist)
);

userRouter.put(
  "/:userId/wishlist",
  authorizeUserAccess,
  validateUserId,
  validateWishlistUpdate,
  asyncHandler(updateWishlist)
);

// Order routes (user-specific)
userRouter.get(
  "/:userId/orders",
  authorizeUserAccess,
  validateUserId,
  validatePagination,
  asyncHandler(getOrders)
);

// Review routes
userRouter.get(
  "/:userId/reviews",
  validateUserId,
  validatePagination,
  asyncHandler(getReviews)
);

userRouter.post(
  "/:userId/reviews",
  authorizeUserAccess,
  validateUserId,
  validateReviewCreate,
  asyncHandler(createReview)
);

// Discount routes
userRouter.get(
  "/:userId/discounts",
  authorizeUserAccess,
  validateUserId,
  validatePagination,
  asyncHandler(getDiscounts)
);

userRouter.post(
  "/:userId/discounts",
  authorizeUserAccess,
  validateUserId,
  validateDiscountCode,
  asyncHandler(addDiscount)
);

export default userRouter;
