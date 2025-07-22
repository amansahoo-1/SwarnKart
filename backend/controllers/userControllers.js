// userControllers.js
import prisma from "../client/prismaClient.js";
import {
  userCreateSchema,
  userUpdateSchema,
  cartUpdateSchema,
  wishlistItemSchema,
  reviewCreateSchema,
} from "../validations/user.validation.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { paginationSchema } from "../validations/common.validation.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import {
  generateUserToken,
  generateToken,
  verifyToken,
  safeDecode,
} from "../utils/jwt.js";
import jwt from "jsonwebtoken";

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid email or password",
    });
  }

  // Generate JWT
  const token = generateUserToken(user);

  // Remove password from response
  const { password: _, ...userData } = user;

  res.json({
    status: "success",
    token,
    data: userData,
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        address: true,
        preferences: true,
        createdAt: true,
        adminId: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  res.json({
    status: "success",
    data: users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getUserById = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ status: "fail", message: "User not found" });
  }

  // Omit password from response
  const { password, ...userData } = user;
  res.json({ status: "success", data: userData });
});

export const createUser = asyncHandler(async (req, res) => {
  const userData = userCreateSchema.parse(req.body);

  // Hash the password before saving
  const hashedPassword = await hashPassword(userData.password);

  const user = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  res.status(201).json({
    status: "success",
    data: user,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const validatedData = userUpdateSchema.parse(req.body);

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    return res.status(404).json({
      status: "fail",
      message: "User not found",
    });
  }

  // Check if email is being updated to an existing one
  if (validatedData.email && validatedData.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (emailExists) {
      return res.status(409).json({
        status: "fail",
        message: "Email already in use",
      });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: validatedData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      address: true,
      preferences: true,
      createdAt: true,
      adminId: true,
    },
  });

  res.json({ status: "success", data: updatedUser });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    return res.status(404).json({
      status: "fail",
      message: "User not found",
    });
  }

  // Use transaction to ensure all related data is deleted
  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: { cart: { userId } },
    }),
    prisma.cart.deleteMany({
      where: { userId },
    }),
    prisma.wishlistItem.deleteMany({
      where: { wishlist: { userId } },
    }),
    prisma.wishlist.deleteMany({
      where: { userId },
    }),
    prisma.review.deleteMany({
      where: { userId },
    }),
    prisma.order.deleteMany({
      where: { userId },
    }),
    prisma.user.delete({
      where: { id: userId },
    }),
  ]);

  res.status(204).send();
});

// Cart Controllers
export const getCart = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              description: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        updatedAt: new Date(),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
  }

  res.json({ status: "success", data: cart });
});

export const updateCart = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const { items } = cartUpdateSchema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    // Get or create cart
    let cart = await tx.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await tx.cart.create({
        data: {
          userId,
          updatedAt: new Date(),
        },
      });
    }

    // Clear existing items
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Add new items
    if (items.length > 0) {
      await tx.cartItem.createMany({
        data: items.map((item) => ({
          cartId: cart.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });
    }

    // Return updated cart
    const updatedCart = await tx.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    res.json({ status: "success", data: updatedCart });
  });
});

// Wishlist Controllers
export const getWishlist = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  let wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      wishlistItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              description: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!wishlist) {
    wishlist = await prisma.wishlist.create({
      data: { userId },
      include: {
        wishlistItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });
  }

  res.json({ status: "success", data: wishlist });
});

export const updateWishlist = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const { productId, action } = wishlistItemSchema.parse(req.body);

  await prisma.$transaction(async (tx) => {
    let wishlist = await tx.wishlist.findUnique({ where: { userId } });
    if (!wishlist) {
      wishlist = await tx.wishlist.create({ data: { userId } });
    }

    if (action === "add") {
      await tx.wishlistItem.upsert({
        where: {
          wishlistId_productId: {
            wishlistId: wishlist.id,
            productId: productId,
          },
        },
        create: {
          wishlistId: wishlist.id,
          productId: productId,
        },
        update: {},
      });
    } else {
      await tx.wishlistItem.deleteMany({
        where: {
          wishlistId: wishlist.id,
          productId: productId,
        },
      });
    }

    const updatedWishlist = await tx.wishlist.findUnique({
      where: { id: wishlist.id },
      include: {
        wishlistItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                description: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    res.json({ status: "success", data: updatedWishlist });
  });
});

// Order Controllers
export const getOrders = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const { page = 1, limit = 10 } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: {
        items: {
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
        discount: {
          select: {
            code: true,
            percentage: true,
            validTill: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  res.json({
    status: "success",
    data: orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Review Controllers
export const getReviews = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const { page = 1, limit = 10 } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.review.count({ where: { userId } }),
  ]);

  res.json({
    status: "success",
    data: reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const createReview = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const { productId, rating, comment } = reviewCreateSchema.parse(req.body);

  const review = await prisma.review.create({
    data: {
      userId,
      productId,
      rating,
      comment,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  });

  res.status(201).json({ status: "success", data: review });
});

// Discount Controllers
export const getDiscounts = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const { page = 1, limit = 10 } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;

  const [discounts, total] = await Promise.all([
    prisma.discount.findMany({
      where: {
        users: {
          some: { id: userId },
        },
        validTill: { gt: new Date() },
      },
      select: {
        id: true,
        code: true,
        percentage: true,
        validTill: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.discount.count({
      where: {
        users: {
          some: { id: userId },
        },
        validTill: { gt: new Date() },
      },
    }),
  ]);

  res.json({
    status: "success",
    data: discounts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const addDiscount = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  const { discountCode } = req.body;
  if (!discountCode) {
    return res.status(400).json({
      status: "fail",
      message: "discountCode is required",
    });
  }

  const discount = await prisma.discount.findUnique({
    where: { code: discountCode },
  });

  if (!discount) {
    return res.status(404).json({
      status: "fail",
      message: "Discount not found",
    });
  }

  if (new Date() > discount.validTill) {
    return res.status(400).json({
      status: "fail",
      message: "Discount has expired",
    });
  }

  // Check if user already has this discount
  const existingLink = await prisma.user.findFirst({
    where: {
      id: userId,
      discounts: {
        some: { id: discount.id },
      },
    },
  });

  if (existingLink) {
    return res.status(400).json({
      status: "fail",
      message: "User already has this discount",
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      discounts: {
        connect: { id: discount.id },
      },
    },
  });

  res.json({
    status: "success",
    data: {
      id: discount.id,
      code: discount.code,
      percentage: discount.percentage,
      validTill: discount.validTill,
    },
  });
});
