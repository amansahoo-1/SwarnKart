import { Prisma } from "../generated/prisma/index.js";

export const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err);

  // Handle specific Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json({
      status: "fail",
      message: "Conflict - duplicate entry",
    });
  }

  // Handle other Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      status: "fail",
      message: "Database error occurred",
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
  });
};
