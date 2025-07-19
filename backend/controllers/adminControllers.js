// backend/controllers/adminController.js
import prisma from "../client/prismaClient.js";
import { Status } from "../generated/prisma/index.js";
import {
  adminCreateSchema,
  adminUpdateSchema,
  adminIdParamSchema,
} from "../validations/admin.validation.js";
import { paginationSchema } from "../validations/common.validation.js";

export const getAdmins = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort,
      order,
    } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
      prisma.admin.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy: sort ? { [sort]: order || "asc" } : { createdAt: "desc" },
        where: {
          status: {
            not: Status.DELETED,
          },
        },
      }),
      prisma.admin.count({
        where: {
          status: {
            not: Status.DELETED,
          },
        },
      }),
    ]);

    res.json({
      status: "success",
      data: admins,
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
};

export const getAdmin = async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin || admin.status === Status.DELETED) {
      return res.status(404).json({
        status: "fail",
        message: "Admin not found",
      });
    }

    res.json({ status: "success", data: admin });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const validatedData = adminCreateSchema.parse(req.body);

    // Check if email already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { email: validatedData.email },
    });

    if (existingAdmin) {
      return res.status(409).json({
        status: "fail",
        message: "Email already in use",
      });
    }

    const newAdmin = await prisma.admin.create({
      data: {
        ...validatedData,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({ status: "success", data: newAdmin });
  } catch (error) {
    next(error);
  }
};

export const updateAdmin = async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const validatedData = adminUpdateSchema.parse(req.body);

    // Check if admin exists and is not deleted
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!existingAdmin || existingAdmin.status === Status.DELETED) {
      return res.status(404).json({
        status: "fail",
        message: "Admin not found",
      });
    }

    // Check if email is being updated to an existing one
    if (validatedData.email && validatedData.email !== existingAdmin.email) {
      const emailExists = await prisma.admin.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return res.status(409).json({
          status: "fail",
          message: "Email already in use",
        });
      }
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        status: true,
        updatedAt: true,
      },
    });

    res.json({ status: "success", data: updatedAdmin });
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);

    // Check if admin exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!existingAdmin || existingAdmin.status === Status.DELETED) {
      return res.status(404).json({
        status: "fail",
        message: "Admin not found",
      });
    }

    await prisma.admin.update({
      where: { id: adminId },
      data: {
        status: Status.DELETED,
        updatedAt: new Date(),
      },
    });

    res.status(204).json();
  } catch (error) {
    next(error);
  }
};

export const getAdminUsers = async (req, res, next) => {
  try {
    const { adminId } = adminIdParamSchema.parse(req.params);
    const { page = 1, limit = 10 } = paginationSchema.parse(req.query);

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { adminId },
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
      prisma.user.count({ where: { adminId } }),
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
};

export const getAdminProducts = async (req, res, next) => {
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
};

export const getAdminInventoryLogs = async (req, res, next) => {
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
};

export const getAdminReports = async (req, res, next) => {
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
};

export const getAdminInvoices = async (req, res, next) => {
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
};

export const getAdminInquiries = async (req, res, next) => {
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
};

export const getAdminSettings = async (req, res, next) => {
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
};

export const getAdminOrders = async (req, res, next) => {
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
};

export const getAdminDiscounts = async (req, res, next) => {
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
};
