import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  discountCreateSchema,
  discountUpdateSchema,
} from "../validations/discount.validation.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js"; // Discount selection fields

const discountSelectFields = {
  id: true,
  code: true,
  percentage: true,
  validTill: true,
  createdAt: true,
  products: {
    select: {
      id: true,
      name: true,
    },
  },
  users: {
    select: {
      id: true,
      name: true,
    },
  },
};

// DISCOUNT CONTROLLERS
export const createDiscount = asyncHandler(async (req, res) => {
  const validatedData = discountCreateSchema.parse({
    ...req.body,
    adminId: req.user.id,
  });

  const discount = await prisma.discount.create({
    data: {
      ...validatedData,
      admin: { connect: { id: req.user.id } },
    },
    select: discountSelectFields,
  });

  return successResponse(res, discount, "Discount created successfully", 201);
});

export const getDiscounts = asyncHandler(async (req, res) => {
  const discounts = await prisma.discount.findMany({
    select: discountSelectFields,
    orderBy: { createdAt: "desc" },
  });

  return successResponse(res, discounts, "Discounts retrieved successfully");
});

export const getDiscountById = asyncHandler(async (req, res) => {
  const { discountId } = req.params;

  const discount = await prisma.discount.findUnique({
    where: { id: discountId },
    select: {
      ...discountSelectFields,
      _count: {
        select: {
          products: true,
          users: true,
          orders: true,
        },
      },
    },
  });

  if (!discount) {
    return errorResponse(res, "Discount not found", 404);
  }

  return successResponse(
    res,
    {
      ...discount,
      productCount: discount._count.products,
      userCount: discount._count.users,
      usageCount: discount._count.orders,
    },
    "Discount retrieved successfully"
  );
});

export const updateDiscount = asyncHandler(async (req, res) => {
  const { discountId } = req.params;
  const validatedData = discountUpdateSchema.parse(req.body);

  const discount = await prisma.discount.update({
    where: { id: discountId },
    data: validatedData,
    select: discountSelectFields,
  });

  return successResponse(res, discount, "Discount updated successfully");
});

export const deleteDiscount = asyncHandler(async (req, res) => {
  const { discountId } = req.params;

  await prisma.discount.delete({
    where: { id: discountId },
  });

  return successResponse(res, null, "Discount deleted successfully", 204);
});

export const applyDiscountToProduct = asyncHandler(async (req, res) => {
  const { discountId, productId } = req.params;

  // Verify the product belongs to the admin (unless superadmin)
  if (req.user.role !== Role.SUPERADMIN) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { adminId: true },
    });

    if (product?.adminId !== req.user.id) {
      return errorResponse(res, "Not authorized to modify this product", 403);
    }
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      discounts: {
        connect: { id: discountId },
      },
    },
  });

  return successResponse(res, null, "Discount applied to product successfully");
});

export const removeDiscountFromProduct = asyncHandler(async (req, res) => {
  const { discountId, productId } = req.params;

  // Verify the product belongs to the admin (unless superadmin)
  if (req.user.role !== Role.SUPERADMIN) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { adminId: true },
    });

    if (product?.adminId !== req.user.id) {
      return errorResponse(res, "Not authorized to modify this product", 403);
    }
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      discounts: {
        disconnect: { id: discountId },
      },
    },
  });

  return successResponse(
    res,
    null,
    "Discount removed from product successfully"
  );
});

export const getProductDiscounts = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const discounts = await prisma.discount.findMany({
    where: {
      products: {
        some: {
          id: productId,
        },
      },
    },
    select: discountSelectFields,
  });

  return successResponse(
    res,
    discounts,
    "Product discounts retrieved successfully"
  );
});

export const getValidProductDiscounts = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const discounts = await prisma.discount.findMany({
    where: {
      products: {
        some: {
          id: productId,
        },
      },
      validTill: {
        gte: new Date(),
      },
    },
    select: discountSelectFields,
  });

  return successResponse(
    res,
    discounts,
    "Valid product discounts retrieved successfully"
  );
});
