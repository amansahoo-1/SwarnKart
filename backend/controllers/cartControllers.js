import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";

// Product selection fields for cart items
const productSelectFields = {
  id: true,
  name: true,
  price: true,
  imageUrl: true,
  description: true,
};

/**
 * Calculate cart totals with optional discount
 */
const calculateCartTotals = (items, discount = null) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const discountAmount = discount ? subtotal * (discount.percentage / 100) : 0;

  const tax = (subtotal - discountAmount) * 0.1; // 10% tax
  const total = subtotal - discountAmount + tax;

  return {
    subtotal,
    discount: discountAmount,
    tax,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
};

/**
 * Get or create user's cart with calculated totals
 */
export const getCart = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: {
      items: {
        include: { product: { select: productSelectFields } },
      },
      discount: {
        select: {
          id: true,
          code: true,
          percentage: true,
        },
      },
    },
  });

  const totals = calculateCartTotals(cart.items, cart.discount);

  return successResponse(
    res,
    {
      ...cart,
      meta: totals,
    },
    "Cart retrieved successfully"
  );
});

/**
 * Replace entire cart contents
 */
export const updateCart = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { items } = req.validated.body;

  // Verify all products exist
  const productIds = items.map((item) => item.productId);
  const existingProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });

  if (existingProducts.length !== productIds.length) {
    const missingIds = productIds.filter(
      (id) => !existingProducts.some((p) => p.id === id)
    );
    return errorResponse(
      res,
      `Products not found: ${missingIds.join(", ")}`,
      404
    );
  }

  const cart = await prisma.$transaction(async (tx) => {
    // Get or create cart
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { discount: true },
    });

    // Atomic update
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    if (items.length > 0) {
      await tx.cartItem.createMany({
        data: items.map((item) => ({
          cartId: cart.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    }

    // Return full cart
    return await tx.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: { select: productSelectFields } } },
        discount: true,
      },
    });
  });

  const totals = calculateCartTotals(cart.items, cart.discount);

  return successResponse(
    res,
    {
      ...cart,
      meta: totals,
    },
    "Cart updated successfully"
  );
});

/**
 * Add item to cart or update quantity
 */
export const addCartItem = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { productId, quantity } = req.validated.body;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  const cart = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { discount: true },
    });

    await tx.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      create: { cartId: cart.id, productId, quantity },
      update: { quantity: { increment: quantity } },
    });

    return await tx.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: { select: productSelectFields } } },
        discount: true,
      },
    });
  });

  const totals = calculateCartTotals(cart.items, cart.discount);

  return successResponse(
    res,
    {
      ...cart,
      meta: totals,
    },
    "Item added to cart"
  );
});

/**
 * Remove item from cart
 */
export const removeCartItem = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const productId = parseInt(req.params.productId);

  const cart = await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUniqueOrThrow({ where: { userId } });

    await tx.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    return await tx.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: { include: { product: { select: productSelectFields } } },
        discount: true,
      },
    });
  });

  const totals = calculateCartTotals(cart.items, cart.discount);

  return successResponse(
    res,
    {
      ...cart,
      meta: totals,
    },
    "Item removed from cart"
  );
});

/**
 * Clear all items from cart
 */
export const clearCart = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);

  await prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({ where: { userId } });
    if (!cart) return;

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({
      where: { id: cart.id },
      data: {
        updatedAt: new Date(),
        discountId: null, // Remove any applied discount
      },
    });
  });

  return successResponse(res, null, "Cart cleared successfully", 204);
});

/**
 * Get cart item count
 */
export const getCartItemCount = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: { select: { quantity: true } } },
  });

  const itemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return successResponse(res, { itemCount }, "Cart item count retrieved");
});

/**
 * Apply discount code to cart
 */
export const applyDiscount = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { code } = req.validated.body;

  const discount = await prisma.discount.findUnique({
    where: { code },
    select: { id: true, code: true, percentage: true, validTill: true },
  });

  if (!discount || new Date(discount.validTill) < new Date()) {
    return errorResponse(res, "Invalid or expired discount code", 400);
  }

  const cart = await prisma.$transaction(async (tx) => {
    // Verify user hasn't already used this discount
    const hasUsedDiscount = await tx.order.findFirst({
      where: { userId, discountId: discount.id },
    });

    if (hasUsedDiscount) {
      throw new Error("Discount code already used");
    }

    return await tx.cart.update({
      where: { userId },
      data: { discountId: discount.id },
      include: {
        items: { include: { product: { select: productSelectFields } } },
        discount: true,
      },
    });
  });

  const totals = calculateCartTotals(cart.items, cart.discount);

  return successResponse(
    res,
    {
      ...cart,
      meta: totals,
    },
    "Discount applied successfully"
  );
});
