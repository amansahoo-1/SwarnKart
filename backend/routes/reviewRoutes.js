import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  createReview,
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getRecentReviews,
  markHelpful,
} from "../controllers/reviewControllers.js";
import {
  reviewCreateSchema,
  reviewUpdateSchema,
  reviewQuerySchema,
} from "../validations/review.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  checkAccountStatus,
  checkRole,
} from "../middleware/authMiddleware.js";
import { Role } from "../generated/prisma/index.js";

const reviewRouter = express.Router();

// Public routes
reviewRouter.get(
  "/",
  validateRequest({ query: reviewQuerySchema }),
  asyncHandler(getReviews)
);
reviewRouter.get("/:id", asyncHandler(getReviewById));

// Authenticated routes
reviewRouter.use(authenticate, checkAccountStatus);

// User review actions
reviewRouter.post(
  "/",
  validateRequest({ body: reviewCreateSchema }),
  asyncHandler(createReview)
);
reviewRouter.post("/:id/helpful", asyncHandler(markHelpful));

// Review owner or admin actions
reviewRouter.put(
  "/:id",
  validateRequest({ body: reviewUpdateSchema }),
  asyncHandler(updateReview)
);
reviewRouter.delete("/:id", asyncHandler(deleteReview));

// Admin only routes
reviewRouter.get(
  "/admin/recent",
  checkRole([Role.ADMIN, Role.SUPERADMIN]),
  validateRequest({ query: reviewQuerySchema }),
  asyncHandler(getRecentReviews)
);

export default reviewRouter;
