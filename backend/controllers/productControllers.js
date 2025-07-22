// backend/controllers/productControllers.js
import prisma from "../client/prismaClient.js";
import {
  productCreateSchema,
  productUpdateSchema,
} from "../validations/product.validation.js";
import { paginationSchema } from "../validations/common.validation.js";

// Helper function to check admin
const isAdmin = (user) => {
  return user;
};

const createProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdmin(req.user)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }

    // Validate request body
    const validatedData = productCreateSchema.parse({
      ...req.body,
      createdById: req.user.id, // Set the creator to the current admin
    });

    // Create product
    const product = await prisma.product.create({
      data: validatedData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProducts = async (req, res) => {
  try {
    // Validate pagination query params
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    // Get products with pagination
    const products = await prisma.product.findMany({
      skip,
      take: limit,
      where: {
        // No restrictions - public access
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate average rating for each product
    const productsWithAvgRating = products.map((product) => {
      const ratings = product.reviews.map((review) => review.rating);
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;

      return {
        ...product,
        avgRating,
        reviewCount: product.reviews.length,
        reviews: undefined, // Remove the reviews array from response
      };
    });

    // Get total count for pagination
    const total = await prisma.product.count();

    res.json({
      data: productsWithAvgRating,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        wishlistItems: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Calculate average rating
    const ratings = product.reviews.map((review) => review.rating);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

    res.json({
      ...product,
      avgRating,
      reviewCount: product.reviews.length,
      wishlistCount: product.wishlistItems.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdmin(req.user)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }

    const { id } = req.params;

    // Validate request body
    const validatedData = productUpdateSchema.parse(req.body);

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: validatedData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(updatedProduct);
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({ errors: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdmin(req.user)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }

    const { id } = req.params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existingProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete product
    await prisma.product.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
