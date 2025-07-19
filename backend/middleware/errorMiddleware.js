import { Prisma } from "../generated/prisma/index.js";
import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "fail",
      message: "Validation error",
      errors: err.errors.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Handle specific Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json({
      status: "fail",
      message: "Conflict - duplicate entry",
      field: err.meta?.target?.[0] || "unknown",
    });
  }

  // Handle other Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      status: "fail",
      message: "Database error occurred",
      code: err.code,
      meta: process.env.NODE_ENV === "development" ? err.meta : undefined,
    });
  }

  // Default error response
  const response = {
    status: "error",
    message: "Internal server error",
  };

  // Include error details in development
  if (process.env.NODE_ENV === "development") {
    response.error = err.message;
    if (err.stack) {
      response.stack = err.stack;
    }
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
