// middleware/validation.middleware.js
import { ZodError } from "zod";

export const validateRequest = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: "fail",
          message: "Validation error",
          errors: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
      } else {
        next(error);
      }
    }
  };
};

export const formatZodError = (error) => {
  if (error instanceof ZodError) {
    return error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
  }
  return "Invalid request data";
};
