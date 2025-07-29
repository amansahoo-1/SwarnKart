import prisma from "../client/prismaClient.js";
import {
  userCreateSchema,
  userUpdateSchema,
} from "../validations/user.validation.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { paginationSchema } from "../validations/common.validation.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateUserToken } from "../utils/jwt.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Check if account is locked
  if (
    user?.loginAttempts >= MAX_LOGIN_ATTEMPTS &&
    new Date(user.lastLoginAttempt) > new Date(Date.now() - LOCK_TIME)
  ) {
    return errorResponse(res, "Account temporarily locked", 423);
  }

  if (!user) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    // Update failed login attempt
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: { increment: 1 },
        lastLoginAttempt: new Date(),
      },
    });

    const attemptsLeft = MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1);
    const message =
      attemptsLeft > 0
        ? `Invalid credentials. ${attemptsLeft} attempts remaining.`
        : "Account locked due to too many failed attempts. Try again later.";

    return errorResponse(res, message, 401);
  }

  // On successful login
  const token = generateUserToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      loginAttempts: 0,
      lastLoginAttempt: null,
    },
  });

  // Remove sensitive data from response
  const { password: _, loginAttempts, lastLoginAttempt, ...userData } = user;

  successResponse(
    res,
    {
      token,
      user: userData,
    },
    "Login successful"
  );
});

export const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.validated.query;
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

  successResponse(
    res,
    {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Users fetched successfully"
  );
});

export const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;

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
    return errorResponse(res, "User not found", 404);
  }

  // Omit sensitive data
  const { password, ...userData } = user;
  successResponse(res, userData, "User found");
});

export const createUser = asyncHandler(async (req, res) => {
  const userData = req.validated.body;
  const hashedPassword = await hashPassword(userData.password);

  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (existingUser) {
    return errorResponse(res, "Email already in use", 409);
  }

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

  successResponse(res, user, "User created successfully", 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;
  const updateData = req.validated.body;

  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return errorResponse(res, "User not found", 404);
  }

  if (updateData.email && updateData.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: updateData.email },
    });
    if (emailExists) {
      return errorResponse(res, "Email already in use", 409);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
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

  successResponse(res, updatedUser, "User updated successfully");
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.validated.params;

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cart: { userId } } }),
    prisma.cart.deleteMany({ where: { userId } }),
    prisma.wishlistItem.deleteMany({ where: { wishlist: { userId } } }),
    prisma.wishlist.deleteMany({ where: { userId } }),
    prisma.review.deleteMany({ where: { userId } }),
    prisma.order.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  successResponse(res, null, "User deleted successfully", 204);
});
