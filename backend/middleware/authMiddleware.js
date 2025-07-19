// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

/**
 * Authentication middleware that verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return next(); // Continue without user for public routes
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        adminId: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Middleware that requires a valid authenticated user
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

/**
 * Middleware that requires admin privileges
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Check if user is an admin (either directly or through admin relationship)
  const isAdmin = await prisma.admin.findUnique({
    where: { id: req.user.adminId || req.user.id },
  });

  if (!isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

/**
 * Middleware to check if user account is active
 */
const checkAccountStatus = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Check user status
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { status: true },
  });

  if (user?.status === "SUSPENDED") {
    return res.status(403).json({ error: "Account suspended" });
  }

  if (user?.status === "DELETED") {
    return res.status(403).json({ error: "Account deleted" });
  }

  next();
};

/**
 * Middleware to authorize user access to their own data
 */
const authorizeUserAccess = async (req, res, next) => {
  const { userId } = req.params;

  // Admins can access any user data
  const isAdmin = await prisma.admin.findUnique({
    where: { id: req.user.adminId || req.user.id },
  });

  if (isAdmin) return next();

  // Regular users can only access their own data
  if (req.user.id !== parseInt(userId)) {
    return res.status(403).json({ error: "Unauthorized access to user data" });
  }

  next();
};

export {
  authenticate,
  requireAuth,
  requireAdmin,
  checkAccountStatus,
  authorizeUserAccess,
};
