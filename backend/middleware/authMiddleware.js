// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/index.js";
import {
  generateToken,
  verifyToken,
  safeDecode,
  generateUserToken,
} from "../utils/jwt.js";

const prisma = new PrismaClient();

/**
 * Attach authenticated user to request (if token exists)
 */
const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
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
    return res.status(401).json({
      error:
        error.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
    });
  }
};
/**
 * Require that a user is authenticated
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

/**
 * Require that the user is a registered admin
 */
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const admin = await prisma.admin.findUnique({
    where: {
      id: req.user.adminId ?? req.user.id, // Support both linked user or direct login
    },
  });

  if (!admin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

/**
 * Check if user account is active
 */
const checkAccountStatus = async (req, res, next) => {
  if (!req.user) return next();

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
 * Authorize user or admin to access a specific userId
 */
const authorizeUserAccess = async (req, res, next) => {
  const { userId } = req.params;

  const isAdmin = await prisma.admin.findUnique({
    where: { id: req.user.adminId ?? req.user.id },
  });

  if (isAdmin || req.user.id === parseInt(userId)) {
    return next();
  }

  return res.status(403).json({ error: "Unauthorized access to user data" });
};

const checkRole = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    const { role } = req.user; // from JWT
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

export {
  authenticate,
  requireAuth,
  requireAdmin,
  checkAccountStatus,
  authorizeUserAccess,
  checkRole,
};
