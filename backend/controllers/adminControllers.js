// backend/controllers/adminController.js
import prisma from "../client/prismaClient.js";
import { Status } from "../generated/prisma/index.js";
import {
  adminCreateSchema,
  adminUpdateSchema,
  adminIdParamSchema,
} from "../validations/admin.validation.js";
import { paginationSchema } from "../validations/common.validation.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { generateToken, verifyToken, safeDecode } from "../utils/jwt.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";

// super admin login
export const loginSuperAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin.role === "SUPERADMIN" || admin.status === Status.DELETED) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  const isMatch = await comparePassword(password, admin.password);
  if (!isMatch) return errorResponse(res, "Invalid credentials", 401);

  const token = generateToken({ id: admin.id, role: admin.role });

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
// ✅ Login Admin
export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || admin.status === Status.DELETED) {
    return errorResponse(res, "Invalid credentials", 401);
  }

  const isMatch = await comparePassword(password, admin.password);
  if (!isMatch) return errorResponse(res, "Invalid credentials", 401);

  const token = generateToken({ id: admin.id, role: admin.role });

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

// ✅ Get all admins (with pagination)
export const getAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = paginationSchema.parse(req.query);
  const skip = (page - 1) * limit;

  const [admins, total] = await Promise.all([
    prisma.admin.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.admin.count(),
  ]);

  return successResponse(
    res,
    {
      total,
      page,
      limit,
      admins,
    },
    "Admins fetched"
  );
});

// ✅ Get a single admin
export const getAdminById = asyncHandler(async (req, res) => {
  const { id } = adminIdParamSchema.parse(req.params);

  const admin = await prisma.admin.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!admin) return errorResponse(res, "Admin not found", 404);

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
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
    },
  });

  return successResponse(res, newAdmin, "Admin created", 201);
});

// ✅ Update admin
export const updateAdmin = asyncHandler(async (req, res) => {
  const { id } = adminIdParamSchema.parse(req.params);
  const data = adminUpdateSchema.parse(req.body);

  const existing = await prisma.admin.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.status === Status.DELETED) {
    return errorResponse(res, "Admin not found", 404);
  }

  const updated = await prisma.admin.update({
    where: { id: Number(id) },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      role: true,
      status: true,
    },
  });

  return successResponse(res, updated, "Admin updated");
});

// ✅ Delete admin (soft delete)
export const deleteAdmin = asyncHandler(async (req, res) => {
  const { id } = adminIdParamSchema.parse(req.params);

  const existing = await prisma.admin.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.status === Status.DELETED) {
    return errorResponse(res, "Admin not found", 404);
  }

  await prisma.admin.update({
    where: { id: Number(id) },
    data: { status: Status.DELETED },
  });

  return successResponse(res, null, "Admin deleted");
});

// admin id is optional for user can be created both from independently and by admin
export const getAdminUsers = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const whereClause = adminId
      ? { adminId } // only fetch users managed by this admin
      : {}; // fetch all users if adminId is not specified

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

    res.json({
      status: "success",
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminProducts = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: { createdById: adminId },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          imageUrl: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where: { createdById: adminId } }),
    ]);

    res.json({
      status: "success",
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminInventoryLogs = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    // Check if admin exists
    const adminExists = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    if (!adminExists) {
      return res.status(404).json({
        status: "fail",
        message: "Admin not found",
      });
    }

    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where: { adminId },
        include: {
          Product: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
            },
          },
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inventoryLog.count({ where: { adminId } }),
    ]);

    res.status(200).json({
      status: "success",
      results: logs.length,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminReports = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { adminId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.report.count({ where: { adminId } }),
    ]);

    res.json({
      status: "success",
      data: reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminInvoices = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { adminId },
        include: {
          Order: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where: { adminId } }),
    ]);

    res.json({
      status: "success",
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminInquiries = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where: { adminId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.inquiry.count({ where: { adminId } }),
    ]);

    res.json({
      status: "success",
      data: inquiries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminSettings = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);

    const settings = await prisma.setting.findMany({
      where: { adminId },
    });

    res.json({
      status: "success",
      data: settings,
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminOrders = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    // Check if admin exists
    const adminExists = await prisma.admin.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    if (!adminExists) {
      return res.status(404).json({
        status: "fail",
        message: "Admin not found",
      });
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { adminId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          discount: {
            select: {
              id: true,
              code: true,
              percentage: true,
              validTill: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
          Invoice: {
            select: {
              id: true,
              pdfUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { adminId } }),
    ]);

    const enhancedOrders = orders.map((order) => {
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const discountAmount = order.discount
        ? subtotal * (order.discount.percentage / 100)
        : 0;

      return {
        ...order,
        subtotal,
        discount: order.discount
          ? {
              ...order.discount,
              discountAmount,
            }
          : null,
        total: subtotal - discountAmount,
        itemCount: order.items.length,
      };
    });

    res.status(200).json({
      status: "success",
      results: enhancedOrders.length,
      data: enhancedOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getAdminDiscounts = asyncHandler(async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({
        where: {
          users: {
            some: {
              adminId: adminId,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.discount.count({
        where: {
          users: {
            some: {
              adminId: adminId,
            },
          },
        },
      }),
    ]);

    res.json({
      status: "success",
      data: discounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});
