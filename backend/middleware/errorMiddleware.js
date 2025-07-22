import { Prisma } from "../generated/prisma/index.js";
import { ZodError } from "zod";

/**
 * Centralized error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return errorResponse(
      res,
      "Validation error",
      400,
      err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      }))
    );
  }

  // Prisma unique constraint violation
  if (err.code === "P2002") {
    return errorResponse(res, "Conflict - duplicate entry", 409, {
      field: err.meta?.target?.[0] || "unknown",
    });
  }

  // Prisma record not found
  if (err.code === "P2025") {
    return errorResponse(res, "Record not found", 404);
  }

  // Prisma known request error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return errorResponse(res, "Database error occurred", 400, {
      code: err.code,
      meta: process.env.NODE_ENV === "development" ? err.meta : undefined,
    });
  }

  // Default fallback
  const response = {
    status: "error",
    message: "Internal server error",
  };

  if (process.env.NODE_ENV === "development") {
    response.error = err.message;
    if (err.stack) response.stack = err.stack;
    response.path = req.originalUrl;
    response.timestamp = new Date().toISOString();
  }

  res.status(500).json(response);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    status: "fail",
    message: "Not Found",
    path: req.originalUrl,
  });
};

/**
 * ✅ Success response wrapper
 */
export const successResponse = (
  res,
  data,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    status: "success",
    message,
    data,
  });
};

/**
 * ❌ Error response wrapper
 */
export const errorResponse = (
  res,
  message,
  statusCode = 400,
  errors = undefined
) => {
  const payload = {
    status: "fail",
    message,
  };

  if (errors) payload.errors = errors;

  return res.status(statusCode).json(payload);
};
