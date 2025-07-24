import { ZodError } from "zod";

// 🚀 Store all validated results here instead of mutating req.query, req.params, etc.
export const validateRequest = (schemas) => {
  return (req, res, next) => {
    try {
      req.validated = {}; // ⬅️ centralized place to store all validated data

      if (schemas.params) {
        req.validated.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.validated.query = schemas.query.parse(req.query);
      }

      if (schemas.body) {
        req.validated.body = schemas.body.parse(req.body);
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
