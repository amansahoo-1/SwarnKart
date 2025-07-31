import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const generateInvoice = asyncHandler(async (req, res) => {
  const { orderId, adminId, pdfUrl } = req.body;

  // Validate order exists
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      error: "Order not found",
    });
  }

  // Validate admin exists
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
  });

  if (!admin) {
    return res.status(404).json({
      success: false,
      error: "Admin not found",
    });
  }

  // Check if invoice already exists for this order
  const existingInvoice = await prisma.invoice.findFirst({
    where: { orderId },
  });

  if (existingInvoice) {
    return res.status(400).json({
      success: false,
      error: "Invoice already exists for this order",
    });
  }

  // Calculate total amount
  const totalAmount = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Create invoice
  const invoice = await prisma.invoice.create({
    data: {
      orderId,
      adminId,
      pdfUrl,
      totalAmount,
    },
    include: {
      order: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
  });

  res.status(201).json({
    success: true,
    data: invoice,
  });
});

export const getOrderInvoices = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  // Validate order exists
  const orderExists = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
  });

  if (!orderExists) {
    return res.status(404).json({
      success: false,
      error: "Order not found",
    });
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: { orderId: parseInt(orderId) },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    }),
    prisma.invoice.count({
      where: { orderId: parseInt(orderId) },
    }),
  ]);

  res.json({
    success: true,
    data: invoices,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getInvoiceById = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(invoiceId) },
    include: {
      order: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
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
  });

  if (!invoice) {
    return res.status(404).json({
      success: false,
      error: "Invoice not found",
    });
  }

  res.json({
    success: true,
    data: invoice,
  });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const { invoiceId } = req.params;
  const { pdfUrl } = req.body;

  // Validate invoice exists
  const existingInvoice = await prisma.invoice.findUnique({
    where: { id: parseInt(invoiceId) },
  });

  if (!existingInvoice) {
    return res.status(404).json({
      success: false,
      error: "Invoice not found",
    });
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: parseInt(invoiceId) },
    data: { pdfUrl },
    include: {
      order: {
        select: {
          id: true,
          status: true,
        },
      },
      admin: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: updatedInvoice,
  });
});

export const getInvoicesByAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { page = 1, limit = 10, status } = req.query;

  const skip = (page - 1) * limit;

  // Validate admin exists
  const adminExists = await prisma.admin.findUnique({
    where: { id: parseInt(adminId) },
  });

  if (!adminExists) {
    return res.status(404).json({
      success: false,
      error: "Admin not found",
    });
  }

  const whereClause = { adminId: parseInt(adminId) };
  if (status) {
    whereClause.order = { status };
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    }),
    prisma.invoice.count({
      where: whereClause,
    }),
  ]);

  res.json({
    success: true,
    data: invoices,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getInvoicesByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  // Validate user exists
  const userExists = await prisma.user.findUnique({
    where: { id: parseInt(userId) },
  });

  if (!userExists) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        order: {
          userId: parseInt(userId),
        },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    }),
    prisma.invoice.count({
      where: {
        order: {
          userId: parseInt(userId),
        },
      },
    }),
  ]);

  res.json({
    success: true,
    data: invoices,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
});
