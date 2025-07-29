import express from "express";
import {
  getWishlist,
  updateWishlist,
  clearWishlist,
  checkWishlistItem,
  moveWishlistToCart,
} from "../controllers/wishlistControllers.js";
import {
  authenticate,
  authorizeUserAccess,
  checkAccountStatus,
} from "../middleware/authMiddleware.js";
import {
  wishlistItemActionSchema,
  wishlistContainsSchema,
  moveToCartSchema,
} from "../validations/wishlist.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";

const wishlistRouter = express.Router();

// Apply authentication and account status check to all routes
wishlistRouter.use(authenticate, checkAccountStatus);

// Get user's wishlist
wishlistRouter.get("/:userId/wishlist", authorizeUserAccess, getWishlist);

// Add/remove item from wishlist
wishlistRouter.post(
  "/:userId/wishlist",
  authorizeUserAccess,
  validateRequest({
    body: wishlistItemActionSchema,
  }),
  updateWishlist
);

// Clear wishlist
wishlistRouter.delete("/:userId/wishlist", authorizeUserAccess, clearWishlist);

// Check if product is in wishlist
wishlistRouter.get(
  "/:userId/wishlist/contains/:productId",
  authorizeUserAccess,
  validateRequest({
    params: wishlistContainsSchema,
  }),
  checkWishlistItem
);

// Move wishlist items to cart
wishlistRouter.post(
  "/:userId/wishlist/move-to-cart",
  authorizeUserAccess,
  validateRequest({
    body: moveToCartSchema,
  }),
  moveWishlistToCart
);

export default wishlistRouter;
