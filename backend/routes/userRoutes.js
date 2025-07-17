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

const userRouter = express.Router();

// Basic CRUD routes
userRouter.get("/", asyncHandler(getUsers));
userRouter.post("/", asyncHandler(createUser));
userRouter.get("/:userId", asyncHandler(getUserById));
userRouter.put("/:userId", asyncHandler(updateUser));
userRouter.delete("/:userId", asyncHandler(deleteUser));

// Cart routes
userRouter.get("/:userId/cart", asyncHandler(getCart));
userRouter.put("/:userId/cart", asyncHandler(updateCart));

// Wishlist routes
userRouter.get("/:userId/wishlist", asyncHandler(getWishlist));
userRouter.put("/:userId/wishlist", asyncHandler(updateWishlist));

// Order routes
userRouter.get("/:userId/orders", asyncHandler(getOrders));

// Review routes
userRouter.get("/:userId/reviews", asyncHandler(getReviews));
userRouter.post("/:userId/reviews", asyncHandler(createReview));

// Discount routes
userRouter.get("/:userId/discounts", asyncHandler(getDiscounts));
userRouter.post("/:userId/discounts", asyncHandler(addDiscount));

export default userRouter;
