import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  loginUser,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userControllers.js";
import {
  userCreateSchema,
  userUpdateSchema,
  userIdParamSchema,
} from "../validations/user.validation.js";
import { validateRequest } from "../middleware/validation.middleware.js";
import {
  authenticate,
  requireAuth,
  checkAccountStatus,
  authorizeUserAccess,
} from "../middleware/authMiddleware.js";
import {
  loginSchema,
  paginationSchema,
} from "../validations/common.validation.js";

const userRouter = express.Router();

// ====================== Public Routes ======================
userRouter.post(
  "/login",
  validateRequest({ body: loginSchema }),
  asyncHandler(loginUser)
);

userRouter.post(
  "/",
  validateRequest({ body: userCreateSchema }),
  asyncHandler(createUser)
);

// ====================== Protected Routes ======================
userRouter.use(authenticate, requireAuth(), checkAccountStatus);

// Reusable validation middleware
const validatePagination = validateRequest({ query: paginationSchema });
const validateUserId = validateRequest({ params: userIdParamSchema });
const validateUpdateUser = validateRequest({ body: userUpdateSchema });

// User management routes
userRouter.get("/", validatePagination, asyncHandler(getUsers));

userRouter.get(
  "/:userId",
  authorizeUserAccess,
  validateUserId,
  asyncHandler(getUserById)
);

userRouter.put(
  "/:userId",
  authorizeUserAccess,
  validateUserId,
  validateUpdateUser,
  asyncHandler(updateUser)
);

userRouter.delete(
  "/:userId",
  authorizeUserAccess,
  validateUserId,
  asyncHandler(deleteUser)
);

export default userRouter;
