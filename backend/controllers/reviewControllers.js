import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  reviewCreateSchema,
  reviewUpdateSchema,
  reviewQuerySchema,
  reviewIdParamSchema,
} from "../validations/review.validation.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";
import { Role } from "../generated/prisma/index.js";

// Helper function to build orderBy clause
const getReviewSorting = (sortBy) => {
  switch (sortBy) {
    case "oldest":
      return { createdAt: "asc" };
    case "highest":
      return { rating: "desc" };
    case "lowest":
      return { rating: "asc" };
    case "mostHelpful":
      return { helpfulCount: "desc" };
    default: // newest
      return { createdAt: "desc" };
  }
};

/**
 * @desc    Create a new review
 * @route   POST /api/reviews
 * @access  Private
 */
export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = reviewCreateSchema.parse(req.body);
  const userId = req.user.id;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  // Check purchase requirement (business logic)
  const hasPurchased = await prisma.order.findFirst({
    where: {
      userId,
      items: { some: { productId } },
      status: { in: ["DELIVERED", "SHIPPED"] },
    },
  });
  if (!hasPurchased) {
    return errorResponse(res, "You can only review purchased products", 403);
  }

  // Check for existing review
  const existingReview = await prisma.review.findFirst({
    where: { userId, productId },
  });
  if (existingReview) {
    return errorResponse(res, "You've already reviewed this product", 409);
  }

  // Create review
  const review = await prisma.review.create({
    data: { userId, productId, rating, comment },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      product: { select: { id: true, name: true } },
    },
  });

  return successResponse(res, review, "Review created successfully", 201);
});

/**
 * @desc    Get all reviews with filtering
 * @route   GET /api/reviews
 * @access  Public
 */
export const getReviews = asyncHandler(async (req, res) => {
  const { page, limit, minRating, maxRating, sortBy, userId, productId } =
    reviewQuerySchema.parse(req.query);

  const skip = (page - 1) * limit;
  const where = {};

  if (minRating || maxRating) {
    where.rating = {
      gte: minRating,
      lte: maxRating,
    };
  }

  if (userId) where.userId = userId;
  if (productId) where.productId = productId;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: getReviewSorting(sortBy),
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        product: { select: { id: true, name: true, imageUrl: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  // Calculate average rating if filtered by product
  let averageRating = null;
  if (productId) {
    const aggregate = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });
    averageRating = aggregate._avg.rating;
  }

  return successResponse(
    res,
    {
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      ...(averageRating !== null && {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: total,
      }),
    },
    "Reviews retrieved successfully"
  );
});

/**
 * @desc    Get a single review by ID
 * @route   GET /api/reviews/:id
 * @access  Public
 */
export const getReviewById = asyncHandler(async (req, res) => {
  const { id } = reviewIdParamSchema.parse(req.params);

  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      product: { select: { id: true, name: true, imageUrl: true } },
    },
  });

  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  return successResponse(res, review, "Review retrieved successfully");
});

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 * @access  Private (Owner or Admin)
 */
export const updateReview = asyncHandler(async (req, res) => {
  const { id } = reviewIdParamSchema.parse(req.params);
  const updateData = reviewUpdateSchema.parse(req.body);
  const userId = req.user.id;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  // Authorization check
  const isAdmin = [Role.ADMIN, Role.SUPERADMIN].includes(req.user.role);
  if (review.userId !== userId && !isAdmin) {
    return errorResponse(res, "Not authorized to update this review", 403);
  }

  const updatedReview = await prisma.review.update({
    where: { id },
    data: {
      ...updateData,
      ...(isAdmin ? { adminId: userId } : {}), // Track admin edits
    },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return successResponse(res, updatedReview, "Review updated successfully");
});

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 * @access  Private (Owner or Admin)
 */
export const deleteReview = asyncHandler(async (req, res) => {
  const { id } = reviewIdParamSchema.parse(req.params);
  const userId = req.user.id;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  // Authorization check
  const isAdmin = [Role.ADMIN, Role.SUPERADMIN].includes(req.user.role);
  if (review.userId !== userId && !isAdmin) {
    return errorResponse(res, "Not authorized to delete this review", 403);
  }

  await prisma.review.delete({ where: { id } });

  return successResponse(res, null, "Review deleted successfully", 204);
});

/**
 * @desc    Get recent reviews (Admin dashboard)
 * @route   GET /api/reviews/admin/recent
 * @access  Private/Admin
 */
export const getRecentReviews = asyncHandler(async (req, res) => {
  if (![Role.ADMIN, Role.SUPERADMIN].includes(req.user.role)) {
    return errorResponse(res, "Admin access required", 403);
  }

  const { limit = 10 } = reviewQuerySchema.parse(req.query);

  const reviews = await prisma.review.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      product: { select: { id: true, name: true } },
    },
  });

  return successResponse(res, reviews, "Recent reviews retrieved");
});

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
export const markHelpful = asyncHandler(async (req, res) => {
  const { id } = reviewIdParamSchema.parse(req.params);
  const userId = req.user.id;

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return errorResponse(res, "Review not found", 404);
  }

  // Check if user already marked this helpful
  const existingVote = await prisma.reviewVote.findUnique({
    where: {
      userId_reviewId: {
        userId,
        reviewId: id,
      },
    },
  });

  if (existingVote) {
    return errorResponse(res, "You've already marked this review", 400);
  }

  // Transaction to update both vote and helpful count
  const [updatedReview] = await prisma.$transaction([
    prisma.review.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    }),
    prisma.reviewVote.create({
      data: {
        userId,
        reviewId: id,
        helpful: true,
      },
    }),
  ]);

  return successResponse(res, updatedReview, "Review marked as helpful");
});
