// controllers/adminController.js
import prisma from "../client/prismaClient.js";
import { Role, Status } from "../generated/prisma/index.js";

export const getAdmins = async (req, res, next) => {
  try {
    const admins = await prisma.admin.findMany({
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
    });
    res.json({ status: "success", data: admins });
  } catch (error) {
    next(error);
  }
};

export const getAdmin = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);

    if (isNaN(adminId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid admin ID",
      });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    admin
      ? res.json({ status: "success", data: admin })
      : res.status(404).json({ status: "fail", message: "Admin not found" });
  } catch (error) {
    next(error);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields (name, email, password)",
      });
    }

    if (role && !Object.values(Role).includes(role)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid role",
      });
    }

    const newAdmin = await prisma.admin.create({
      data: {
        name,
        email,
        password,
        phoneNumber,
        role: role || Role.SUPERADMIN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
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
    const adminId = Number(req.params.adminId);
    const { name, email, phoneNumber, avatarUrl, role, status } = req.body;

    if (isNaN(adminId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid admin ID",
      });
    }

    if (role && !Object.values(Role).includes(role)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid role",
      });
    }

    if (status && !Object.values(Status).includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid status",
      });
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: adminId },
      data: {
        name,
        email,
        phoneNumber,
        avatarUrl,
        role,
        status,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
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
    const adminId = Number(req.params.adminId);

    if (isNaN(adminId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid admin ID",
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
    const adminId = Number(req.params.adminId);

    if (isNaN(adminId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid admin ID",
      });
    }

    const users = await prisma.user.findMany({
      where: { adminId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    res.json({ status: "success", data: users });
  } catch (error) {
    next(error);
  }
};

export const getAdminProducts = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);

    if (isNaN(adminId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid admin ID",
      });
    }

    const products = await prisma.product.findMany({
      where: { createdById: adminId },
      select: {
        id: true,
        name: true,
        price: true,
        description: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    res.json({ status: "success", data: products });
  } catch (error) {
    next(error);
  }
};

export const getAdminInventoryLogs = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    if (isNaN(adminId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid admin ID format",
      });
    }

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

    const logs = await prisma.inventoryLog.findMany({
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
    });

    res.status(200).json({
      status: "success",
      results: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminReports = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    if (isNaN(adminId))
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid admin ID" });

    const reports = await prisma.report.findMany({
      where: { adminId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: reports });
  } catch (error) {
    next(error);
  }
};

export const getAdminInvoices = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    if (isNaN(adminId))
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid admin ID" });

    const invoices = await prisma.invoice.findMany({
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
    });
    res.json({ status: "success", data: invoices });
  } catch (error) {
    next(error);
  }
};

export const getAdminInquiries = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    if (isNaN(adminId))
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid admin ID" });

    const inquiries = await prisma.inquiry.findMany({
      where: { adminId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: inquiries });
  } catch (error) {
    next(error);
  }
};

export const getAdminSettings = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    if (isNaN(adminId))
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid admin ID" });

    const settings = await prisma.setting.findMany({
      where: { adminId },
    });
    res.json({ status: "success", data: settings });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    if (isNaN(adminId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid admin ID format",
      });
    }

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

    const orders = await prisma.order.findMany({
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
    });

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
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminDiscounts = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);
    if (isNaN(adminId))
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid admin ID" });

    const discounts = await prisma.discount.findMany({
      where: {
        users: {
          some: {
            adminId: adminId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ status: "success", data: discounts });
  } catch (error) {
    next(error);
  }
};
