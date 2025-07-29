import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { orderCreateSchema } from "../validations/order.validation.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";
import { OrderStatus, Role } from "../generated/prisma/index.js";

// Product selection fields for order items
const productSelectFields = {
  id: true,
  name: true,
  price: true,
  imageUrl: true,
  description: true,
};

// Order status transition rules
const statusTransitions = {
  [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.RETURN_REQUESTED]: [
    OrderStatus.RETURN_APPROVED,
    OrderStatus.RETURN_REJECTED,
  ],
  [OrderStatus.RETURN_APPROVED]: [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.RETURN_REJECTED]: [],
};

export const createOrder = asyncHandler(async (req, res) => {
  const validatedData = orderCreateSchema.parse({
    ...req.body,
    userId: req.user.id,
  });
  const { items, discountId, adminId } = validatedData;

  const order = await prisma.$transaction(async (tx) => {
    // 1. Validate all referenced entities exist
    await validateOrderEntities(tx, {
      userId: req.user.id,
      adminId,
      discountId,
      items,
    });

    // 2. Calculate order total and apply discount
    const { totalAmount, discountAmount } = await calculateOrderTotal(
      tx,
      items,
      discountId
    );

    // 3. Create the order
    const order = await tx.order.create({
      data: {
        userId: req.user.id,
        adminId,
        discountId,
        totalAmount,
        status: OrderStatus.PENDING,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: true },
    });

    // 4. Update inventory
    await updateInventoryForOrder(tx, order, adminId || req.user.id);

    // 5. Clear user's cart
    await tx.cartItem.deleteMany({
      where: { cart: { userId: req.user.id } },
    });

    return order;
  });

  // 6. Return full order details
  const orderWithDetails = await getOrderDetails(order.id);
  return successResponse(
    res,
    orderWithDetails,
    "Order created successfully",
    201
  );
});

export const getOrderHistory = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10, status } = req.validated.query;

  const skip = (page - 1) * limit;
  const where = { userId: Number(userId) };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: productSelectFields },
          },
        },
        discount: {
          select: {
            code: true,
            percentage: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return successResponse(
    res,
    {
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Order history retrieved successfully"
  );
});

export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.validated.params;

  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: { select: productSelectFields } } },
      discount: { select: { id: true, code: true, percentage: true } },
      admin: { select: { id: true, name: true } },
      Invoice: { select: { id: true, pdfUrl: true, createdAt: true } },
      returnRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) {
    return errorResponse(res, "Order not found", 404);
  }

  // Authorization check
  if (req.user.role === Role.USER && order.userId !== req.user.id) {
    return errorResponse(res, "Not authorized to view this order", 403);
  }

  return successResponse(res, order, "Order retrieved successfully");
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.validated.params;
  const { status, adminNote } = req.validated.body;

  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
  });

  if (!order) {
    return errorResponse(res, "Order not found", 404);
  }

  // Validate status transition
  if (!isValidStatusTransition(order.status, status)) {
    return errorResponse(
      res,
      `Invalid status transition from ${order.status} to ${status}`,
      400
    );
  }

  const updateData = { status };
  if (adminNote) updateData.adminNote = adminNote;

  const updatedOrder = await prisma.order.update({
    where: { id: Number(orderId) },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Handle inventory for returns/refunds
  if (
    status === OrderStatus.RETURN_APPROVED ||
    status === OrderStatus.REFUNDED
  ) {
    await restoreInventoryForOrder(order, req.user.id);
  }

  return successResponse(
    res,
    updatedOrder,
    "Order status updated successfully"
  );
});

export const getAdminOrders = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const { page = 1, limit = 10, status } = req.validated.query;

  const skip = (page - 1) * limit;
  const where = { adminId: Number(adminId) };
  if (status) where.status = status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          select: {
            quantity: true,
            product: { select: { name: true, price: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return successResponse(
    res,
    {
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Admin orders retrieved successfully"
  );
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.validated.params;
  const { reason } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: { items: true, user: { select: { id: true } } },
  });

  if (!order) {
    return errorResponse(res, "Order not found", 404);
  }

  // Authorization check
  if (req.user.role === Role.USER && order.user.id !== req.user.id) {
    return errorResponse(res, "Not authorized to cancel this order", 403);
  }

  // Validate cancellation
  if (order.status === OrderStatus.CANCELLED) {
    return errorResponse(res, "Order is already cancelled", 400);
  }

  if (![OrderStatus.PENDING, OrderStatus.PROCESSING].includes(order.status)) {
    return errorResponse(res, "Order cannot be cancelled at this stage", 400);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: Number(orderId) },
    data: {
      status: OrderStatus.CANCELLED,
      cancellationReason: reason,
    },
  });

  // Restore inventory if order was processing
  if (order.status === OrderStatus.PROCESSING) {
    await restoreInventoryForOrder(order, req.user.id);
  }

  return successResponse(res, updatedOrder, "Order cancelled successfully");
});

export const requestReturn = asyncHandler(async (req, res) => {
  const { orderId } = req.validated.params;
  const { reason, items } = req.validated.body;

  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: { items: true, user: { select: { id: true } } },
  });

  if (!order) {
    return errorResponse(res, "Order not found", 404);
  }

  // Authorization check
  if (order.user.id !== req.user.id) {
    return errorResponse(res, "Not authorized to return this order", 403);
  }

  // Validate return eligibility
  if (![OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) {
    return errorResponse(res, "Order cannot be returned at this stage", 400);
  }

  // Validate items being returned
  if (items && items.length > 0) {
    const invalidItems = items.filter(
      (item) => !order.items.some((i) => i.productId === item.productId)
    );
    if (invalidItems.length > 0) {
      return errorResponse(
        res,
        `Invalid product IDs: ${invalidItems.map((i) => i.productId).join(", ")}`,
        400
      );
    }
  }

  // Create return request
  const returnRequest = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      userId: req.user.id,
      reason,
      status: "PENDING",
      items: items
        ? {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              reason: item.reason,
            })),
          }
        : undefined,
    },
  });

  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: order.id },
    data: { status: OrderStatus.RETURN_REQUESTED },
  });

  return successResponse(
    res,
    { ...updatedOrder, returnRequest },
    "Return request submitted successfully"
  );
});

//───────────────────────────────────────────────────
// Helper Functions
//───────────────────────────────────────────────────

async function validateOrderEntities(
  prisma,
  { userId, adminId, discountId, items }
) {
  // Validate user exists
  const userExists = await prisma.user.findUnique({ where: { id: userId } });
  if (!userExists) throw new Error("User not found");

  // Validate admin exists if provided
  if (adminId) {
    const adminExists = await prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!adminExists) throw new Error("Admin not found");
  }

  // Validate discount exists and is valid if provided
  if (discountId) {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId },
    });
    if (!discount) throw new Error("Discount not found");
    if (new Date() > new Date(discount.validTill))
      throw new Error("Discount has expired");
  }

  // Validate all products exist and have sufficient inventory
  const productIds = items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { inventory: true },
  });

  if (products.length !== items.length) {
    const missingIds = productIds.filter(
      (id) => !products.some((p) => p.id === id)
    );
    throw new Error(`Products not found: ${missingIds.join(", ")}`);
  }

  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (product.inventory.quantity < item.quantity) {
      throw new Error(`Insufficient inventory for product ${product.name}`);
    }
  }
}

async function calculateOrderTotal(prisma, items, discountId) {
  let totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  let discountAmount = 0;

  if (discountId) {
    const discount = await prisma.discount.findUnique({
      where: { id: discountId },
    });
    discountAmount = totalAmount * (discount.percentage / 100);
    totalAmount -= discountAmount;
  }

  return { totalAmount, discountAmount };
}

async function updateInventoryForOrder(prisma, order, adminId) {
  for (const item of order.items) {
    await prisma.inventory.update({
      where: { productId: item.productId },
      data: { quantity: { decrement: item.quantity } },
    });

    await prisma.inventoryLog.create({
      data: {
        productId: item.productId,
        change: -item.quantity,
        reason: `Order ${order.id}`,
        adminId,
      },
    });
  }
}

async function restoreInventoryForOrder(order, adminId) {
  await prisma.$transaction(
    order.items.map((item) =>
      prisma.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { increment: item.quantity } },
      })
    )
  );

  await prisma.$transaction(
    order.items.map((item) =>
      prisma.inventoryLog.create({
        data: {
          productId: item.productId,
          change: item.quantity,
          reason: `Order ${order.id} return/refund`,
          adminId,
        },
      })
    )
  );
}

async function getOrderDetails(orderId) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } },
      discount: true,
      admin: { select: { id: true, name: true } },
    },
  });
}

function isValidStatusTransition(currentStatus, newStatus) {
  return statusTransitions[currentStatus]?.includes(newStatus) || false;
}
