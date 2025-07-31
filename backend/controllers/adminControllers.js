// backend/controllers/adminController.js
import prisma from "../client/prismaClient.js";
import {
  adminCreateSchema,
  adminUpdateSchema,
  adminIdParamSchema,
} from "../validations/admin.validation.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateAdminToken } from "../utils/jwt.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";
import { Role, Status } from "../generated/prisma/index.js";

// ♻️ Reusable select fields
export const adminSelectFields = {
  id: true,
  name: true,
  email: true,
  phoneNumber: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
};

// ✅ Super Admin Login
export const loginSuperAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (
    !admin ||
    admin.role !== "SUPERADMIN" ||
    admin.status === Status.DELETED
  ) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  const isMatch = await comparePassword(password, admin.password);
  if (!isMatch) return errorResponse(res, "Invalid Password", 401);

  const token = generateAdminToken({ id: admin.id, role: admin.role });

  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return successResponse(
    res,
    {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    },
    "Login successful"
  );
});

// ✅ Admin Login
export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });

  // Check if admin exists and isn't deleted
  if (!admin || admin.status === Status.DELETED) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  // Validate password
  const isMatch = await comparePassword(password, admin.password);

  if (!isMatch) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  // Generate JWT token
  const token = generateAdminToken({ id: admin.id, role: admin.role });

  // Update last login timestamp
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  return successResponse(
    res,
    {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
      },
    },
    "Login successful"
  );
});
// ✅ Get all admins (paginated)
export const getAdmin = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.validated.query;
  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      skip,
      take: limit,
      orderBy: { [sort]: order },
      select: adminSelectFields,
      where: {
        status: "ACTIVE", // Optional filter
      },
    }),
    prisma.admin.count({
      where: {
        status: "ACTIVE",
      },
    }),
  ]);

  return successResponse(
    res,
    {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      admins,
    },
    "Admins fetched successfully"
  );
});

// ✅ Get single admin by ID (validated)
export const getAdminById = asyncHandler(async (req, res) => {
  const { adminId } = req.validated.params; // Now using adminId instead of id

  const admin = await prisma.admin.findUnique({
    where: { id: adminId }, // No need for parseInt since Zod already validated it as number
    select: adminSelectFields,
  });

  if (!admin) {
    return errorResponse(res, "Admin not found", 404);
  }

  return successResponse(res, admin, "Admin found");
});

// ✅ Create new admin
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber, password, role } = adminCreateSchema.parse(
    req.body
  );

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) return errorResponse(res, "Email already exists", 409);

  const hashedPassword = await hashPassword(password);

  const newAdmin = await prisma.admin.create({
    data: {
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      status: Status.ACTIVE,
    },
    select: adminSelectFields,
  });

  return successResponse(res, newAdmin, "Admin created", 201);
});

// ✅ Update admin (with validation)
export const updateAdmin = asyncHandler(async (req, res) => {
  const id = req.validated.params.adminId; // Already validated by Zod middleware
  const data = req.validated.body; // Already validated by `validateUpdateAdmin`

  const existing = await prisma.admin.findUnique({ where: { id } });

  if (!existing || existing.status === Status.DELETED) {
    return errorResponse(res, "Admin not found", 404);
  }

  const updated = await prisma.admin.update({
    where: { id },
    data,
    select: adminSelectFields,
  });

  return successResponse(res, updated, "Admin updated");
});

export const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = adminIdParamSchema.parse(req.params);

  // Enforce SuperAdmin-only deletion
  if (req.admin?.role !== Role.SUPERADMIN) {
    return errorResponse(res, "Only SuperAdmin can delete admins", 403);
  }

  const existing = await prisma.admin.findUnique({ where: { id } });

  if (!existing || existing.status === Status.DELETED) {
    return errorResponse(res, "Admin not found or already deleted", 404);
  }

  const deleted = await prisma.admin.update({
    where: { id },
    data: { status: Status.DELETED },
    select: adminSelectFields,
  });

  return successResponse(res, deleted, "Admin deleted successfully");
});

// admin id is optional for user can be created both from independently and by admin
// 1. Consistent Response Format
// Use successResponse/errorResponse consistently everywhere
export const getAdminUsers = asyncHandler(async (req, res) => {
  const { adminId } = req.validated.params;
  const { page = 1, limit = 10 } = req.validated.query;
  const skip = (page - 1) * limit;

  const whereClause = adminId ? { adminId } : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  // Use successResponse instead of direct res.json()
  return successResponse(
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

// 2. Add Admin Dashboard Endpoint
export const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const stats = await prisma.$transaction([
    prisma.user.count(),
    prisma.order.count({ where: { adminId: req.user.id } }),
    prisma.product.count({ where: { adminId: req.user.id } }),
    // Add more metrics as needed
  ]);

  return successResponse(
    res,
    {
      totalUsers: stats[0],
      totalOrders: stats[1],
      totalProducts: stats[2],
    },
    "Dashboard stats fetched"
  );
});

// 3. Add Admin Profile Endpoint
export const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.user.id },
    select: adminSelectFields,
  });

  if (!admin) {
    return errorResponse(res, "Admin not found", 404);
  }

  return successResponse(res, admin, "Admin profile fetched");
});
