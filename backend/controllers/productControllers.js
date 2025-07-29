import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  productCreateSchema,
  productUpdateSchema,
} from "../validations/product.validation.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";

// Product selection fields for different scenarios
const productSelectFields = {
  id: true,
  name: true,
  price: true,
  description: true,
  imageUrl: true,
  createdAt: true,
  admin: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

const reviewSelectFields = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
};

export const createProduct = asyncHandler(async (req, res) => {
  const validatedData = productCreateSchema.parse({
    ...req.body,
    adminId: req.user.id,
  });

  const product = await prisma.product.create({
    data: validatedData,
    select: productSelectFields,
  });

  return successResponse(res, product, "Product created successfully", 201);
});

export const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    minPrice,
    maxPrice,
    search,
  } = req.validated.query;
  const skip = (page - 1) * limit;

  const where = {
    price: {
      gte: minPrice ? Number(minPrice) : undefined,
      lte: maxPrice ? Number(maxPrice) : undefined,
    },
    name: search ? { contains: search, mode: "insensitive" } : undefined,
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      skip,
      take: limit,
      where,
      select: {
        ...productSelectFields,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);

  const productsWithStats = products.map((product) => ({
    ...product,
    avgRating:
      product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          product.reviews.length
        : null,
    reviewCount: product.reviews.length,
  }));

  return successResponse(
    res,
    {
      data: productsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Products retrieved successfully"
  );
});

export const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.validated.params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      ...productSelectFields,
      reviews: {
        select: reviewSelectFields,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          wishlistItems: true,
          reviews: true,
        },
      },
    },
  });

  if (!product) {
    return errorResponse(res, "Product not found", 404);
  }

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
        product.reviews.length
      : null;

  return successResponse(
    res,
    {
      ...product,
      avgRating,
      reviewCount: product._count.reviews,
      wishlistCount: product._count.wishlistItems,
    },
    "Product retrieved successfully"
  );
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.validated.params;
  const validatedData = productUpdateSchema.parse(req.body);

  // Verify the product belongs to the admin (unless superadmin)
  if (req.user.role !== Role.SUPERADMIN) {
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { adminId: true },
    });

    if (existingProduct?.adminId !== req.user.id) {
      return errorResponse(res, "Not authorized to update this product", 403);
    }
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: validatedData,
    select: productSelectFields,
  });

  return successResponse(res, product, "Product updated successfully");
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.validated.params;

  // Verify the product belongs to the admin (unless superadmin)
  if (req.user.role !== Role.SUPERADMIN) {
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { adminId: true },
    });

    if (existingProduct?.adminId !== req.user.id) {
      return errorResponse(res, "Not authorized to delete this product", 403);
    }
  }

  await prisma.product.delete({
    where: { id: productId },
  });

  return successResponse(res, null, "Product deleted successfully", 204);
});
