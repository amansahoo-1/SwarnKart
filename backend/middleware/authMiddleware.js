// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/index.js";
import { verifyToken } from "../utils/jwt.js";

const prisma = new PrismaClient();

/**
 * ✅ Attach authenticated user/admin to request (decoded from token)
 */
const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return next(); // allow public routes

  try {
    const decoded = verifyToken(token); // { id, role, email, ... }
    let user;

    if (decoded.role === "USER") {
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });
    } else {
      user = await prisma.admin.findUnique({
        where: { id: decoded.id },
      });
    }

    if (!user) return res.status(401).json({ error: "User not found" });

    req.user = {
      ...decoded, // carry id, role, email
      ...user, // merge db data like status
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error:
        error.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
    });
  }
};

/**
 * ✅ Ensure user is authenticated + authorized (supports role check)
 */
const requireAuth = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};

/**
 * ✅ For Admin-specific protection (not general user)
 */
const requireAdmin = async (req, res, next) => {
  if (
    !req.user ||
    (req.user.role !== "ADMIN" && req.user.role !== "SUPERADMIN")
  ) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: req.user.id },
  });

  if (!admin) return res.status(403).json({ error: "Admin not found" });

  next();
};

/**
 * ✅ Status enforcement middleware
 */
const checkAccountStatus = async (req, res, next) => {
  if (!req.user) return next();

  if (req.user.status === "SUSPENDED") {
    return res.status(403).json({ error: "Account suspended" });
  }

  if (req.user.status === "DELETED") {
    return res.status(403).json({ error: "Account deleted" });
  }

  next();
};

/**
 * ✅ Allows only same-user or admin to access userId-specific resources
 */
const authorizeUserAccess = async (req, res, next) => {
  const { userId } = req.params;

  if (
    req.user.role === "ADMIN" ||
    req.user.role === "SUPERADMIN" ||
    req.user.id === parseInt(userId)
  ) {
    return next();
  }

  return res.status(403).json({ error: "Unauthorized access to user data" });
};

/**
 * ✅ Reusable role checker
 */
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
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
