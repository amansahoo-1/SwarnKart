import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";

/**
 * @desc    Get user's wishlist with products
 * @route   GET /api/users/:userId/wishlist
 * @access  Private (User-specific)
 */
export const getWishlist = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: parseInt(userId) },
    include: {
      wishlistItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              description: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          addedAt: "desc",
        },
      },
    },
  });

  // If no wishlist exists, return empty array
  const responseData = wishlist
    ? wishlist
    : { id: null, userId: parseInt(userId), wishlistItems: [] };

  successResponse(res, {
    data: responseData,
    count: wishlist?.wishlistItems?.length || 0,
  });
});

/**
 * @desc    Add or remove item from wishlist
 * @route   POST /api/users/:userId/wishlist
 * @access  Private (User-specific)
 */
export const updateWishlist = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { productId, action } = req.validated.body;

  // Check if product exists
  const productExists = await prisma.product.findUnique({
    where: { id: parseInt(productId) },
  });

  if (!productExists) {
    return errorResponse(res, "Product not found", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    // Find or create wishlist
    let wishlist = await tx.wishlist.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (!wishlist) {
      wishlist = await tx.wishlist.create({
        data: { userId: parseInt(userId) },
      });
    }

    // Process the action
    if (action === "add") {
      await tx.wishlistItem.upsert({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId: parseInt(productId),
          },
        },
        create: {
          wishlistId: wishlist.id,
          productId: parseInt(productId),
          addedAt: new Date(),
        },
        update: {},
      });
    } else {
      await tx.wishlistItem.deleteMany({
        where: {
          wishlistId: wishlist.id,
          productId: parseInt(productId),
        },
      });
    }

    // Return updated wishlist
    return await tx.wishlist.findUnique({
      where: { id: wishlist.id },
      include: {
        wishlistItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
  });

  successResponse(res, {
    message: `Product ${action === "add" ? "added to" : "removed from"} wishlist`,
    data: result,
  });
});

/**
 * @desc    Clear entire wishlist
 * @route   DELETE /api/users/:userId/wishlist
 * @access  Private (User-specific)
 */
export const clearWishlist = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await prisma.$transaction(async (tx) => {
    const wishlist = await tx.wishlist.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (!wishlist) {
      return { count: 0 };
    }

    const deleteCount = await tx.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id },
    });

    return deleteCount;
  });

  successResponse(res, {
    message: "Wishlist cleared successfully",
    count: result.count,
  });
});

/**
 * @desc    Check if product is in user's wishlist
 * @route   GET /api/users/:userId/wishlist/contains/:productId
 * @access  Private (User-specific)
 */
export const checkWishlistItem = asyncHandler(async (req, res) => {
  const { userId, productId } = req.validated.params;

  const wishlist = await prisma.wishlist.findUnique({
    where: { userId: parseInt(userId) },
    include: {
      wishlistItems: {
        where: { productId: parseInt(productId) },
        select: { id: true },
      },
    },
  });

  successResponse(res, {
    data: {
      isInWishlist: wishlist?.wishlistItems?.length > 0,
    },
  });
});

/**
 * @desc    Move wishlist items to cart
 * @route   POST /api/users/:userId/wishlist/move-to-cart
 * @access  Private (User-specific)
 */
export const moveWishlistToCart = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { clearAfterMove } = req.validated.body;

  const result = await prisma.$transaction(async (tx) => {
    // Get wishlist with items
    const wishlist = await tx.wishlist.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        wishlistItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!wishlist || wishlist.wishlistItems.length === 0) {
      return { movedCount: 0, cleared: false };
    }

    // Get or create user's cart
    let cart = await tx.cart.findUnique({
      where: { userId: parseInt(userId) },
    });

    if (!cart) {
      cart = await tx.cart.create({
        data: { userId: parseInt(userId) },
      });
    }

    // Process each wishlist item
    const movedItems = [];

    for (const item of wishlist.wishlistItems) {
      // Check if product already exists in cart
      const existingCartItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: item.productId,
        },
      });

      if (existingCartItem) {
        // Update quantity if already in cart
        await tx.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 },
        });
      } else {
        // Add new item to cart
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            quantity: 1,
          },
        });
      }
      movedItems.push(item.productId);
    }

    // Clear wishlist if requested
    let cleared = false;
    if (clearAfterMove) {
      await tx.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id },
      });
      cleared = true;
    }

    return {
      movedCount: movedItems.length,
      cleared,
      cartId: cart.id,
    };
  });

  successResponse(res, {
    message: `${result.movedCount} items moved to cart${result.cleared ? " and wishlist cleared" : ""}`,
    data: result,
  });
});
