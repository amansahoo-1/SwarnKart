import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  loginUser,
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
  checkRole,
} from "../middleware/authMiddleware.js";
import { loginSchema } from "../validations/common.validation.js";

const userRouter = express.Router();

// Public route
userRouter.post(
  "/login",
  validateRequest({ body: loginSchema }),
  asyncHandler(loginUser)
);

userRouter.post(
  "/",
  validateRequest({ body: userCreateSchema }),
  asyncHandler(createUser)
);

// Auth-protected routes
userRouter.use(authenticate, requireAuth, checkAccountStatus, checkRole);

// Validation middleware
const validatePagination = validateRequest({ query: paginationSchema });
const validateUserId = validateRequest({ params: userIdParamSchema });
const validateUpdateUser = validateRequest({ body: userUpdateSchema });
const validateCartUpdate = validateRequest({ body: cartUpdateSchema });
const validateWishlistUpdate = validateRequest({ body: wishlistItemSchema });
const validateReviewCreate = validateRequest({ body: reviewCreateSchema });
const validateDiscountCode = validateRequest({ body: discountCodeSchema });

// CRUD operations
userRouter.get("/", validatePagination, asyncHandler(getUsers));

userRouter.get(
  "/:userId",
  authorizeUserAccess,
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

// Cart routes
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

// Wishlist routes
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

// Order routes
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
