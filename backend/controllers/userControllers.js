// userControllers.js
import prisma from "../client/prismaClient.js";

// Utility function for validating IDs
const validateId = (id) => {
  const numId = Number(id);
  return isNaN(numId) ? null : numId;
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
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
    res.json({ status: "success", data: users });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

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
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

    // Omit password from response
    const { password, ...userData } = user;
    res.json({ status: "success", data: userData });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      avatarUrl,
      address,
      preferences,
      adminId,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Name, email, and password are required",
      });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password, // Note: Password should be hashed before this point
        phone,
        avatarUrl,
        address,
        preferences,
        adminId: adminId ? Number(adminId) : null,
      },
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

    res.status(201).json({ status: "success", data: newUser });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

    const { name, email, phone, avatarUrl, address, preferences, adminId } =
      req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        avatarUrl,
        address,
        preferences,
        adminId: adminId ? Number(adminId) : null,
      },
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
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

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
  } catch (error) {
    next(error);
  }
};

// Cart Controllers
export const getCart = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

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
  } catch (error) {
    next(error);
  }
};

export const updateCart = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res
        .status(400)
        .json({ status: "fail", message: "Items must be an array" });
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || !item.quantity || isNaN(item.quantity)) {
        return res.status(400).json({
          status: "fail",
          message: "Each item must have productId and quantity",
        });
      }
    }

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
  } catch (error) {
    next(error);
  }
};

// Wishlist Controllers
export const getWishlist = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

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
  } catch (error) {
    next(error);
  }
};

export const updateWishlist = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

    const { productId, action } = req.body;
    if (!productId || !action) {
      return res.status(400).json({
        status: "fail",
        message: "productId and action are required",
      });
    }

    const validActions = ["add", "remove"];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        status: "fail",
        message: "Action must be either 'add' or 'remove'",
      });
    }

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
  } catch (error) {
    next(error);
  }
};

// Order Controllers
export const getOrders = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

    const orders = await prisma.order.findMany({
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
    });

    res.json({ status: "success", data: orders });
  } catch (error) {
    next(error);
  }
};

// Review Controllers
export const getReviews = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

    const reviews = await prisma.review.findMany({
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
    });

    res.json({ status: "success", data: reviews });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

    const { productId, rating, comment } = req.body;
    if (!productId || rating === undefined) {
      return res.status(400).json({
        status: "fail",
        message: "productId and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        status: "fail",
        message: "Rating must be between 1 and 5",
      });
    }

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
  } catch (error) {
    next(error);
  }
};

// Discount Controllers
export const getDiscounts = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

    const discounts = await prisma.discount.findMany({
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
    });

    res.json({ status: "success", data: discounts });
  } catch (error) {
    next(error);
  }
};

export const addDiscount = async (req, res, next) => {
  try {
    const userId = validateId(req.params.userId);
    if (!userId)
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid user ID" });

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
  } catch (error) {
    next(error);
  }
};
