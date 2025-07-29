import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  inventoryAdjustmentSchema,
  inventoryLogQuerySchema,
  inventoryIdParamSchema,
  logIdParamSchema,
  adminIdParamSchema,
} from "../validations/inventory.validation.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";

export const getInventory = asyncHandler(async (req, res) => {
  const { productId } = inventoryIdParamSchema.parse(req.params);

  const inventory = await prisma.inventory.findUnique({
    where: { productId: Number(productId) },
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
  });

  if (!inventory) {
    return errorResponse(res, "Inventory not found for this product", 404);
  }

  return successResponse(res, inventory, "Inventory retrieved successfully");
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const validatedData = inventoryAdjustmentSchema.parse({
    ...req.body,
    adminId: req.user.id,
  });

  const result = await prisma.$transaction(async (tx) => {
    // 1. Get current inventory
    const inventory = await tx.inventory.findUnique({
      where: { productId: validatedData.productId },
    });

    if (!inventory) {
      throw new Error("Inventory not found for this product");
    }

    // 2. Check if adjustment would make quantity negative
    const newQuantity = inventory.quantity + validatedData.change;
    if (newQuantity < 0) {
      throw new Error(
        `Adjustment would result in negative inventory (current: ${inventory.quantity}, change: ${validatedData.change})`
      );
    }

    // 3. Update inventory
    const updatedInventory = await tx.inventory.update({
      where: { productId: validatedData.productId },
      data: { quantity: newQuantity },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 4. Create inventory log
    const log = await tx.inventoryLog.create({
      data: {
        productId: validatedData.productId,
        change: validatedData.change,
        reason: validatedData.reason,
        adminId: validatedData.adminId,
        previousQuantity: inventory.quantity,
        newQuantity,
      },
    });

    return { inventory: updatedInventory, log };
  });

  return successResponse(res, result, "Inventory adjusted successfully", 201);
});

export const bulkUpdateInventory = asyncHandler(async (req, res) => {
  const { adjustments, adminId } = inventoryBulkUpdateSchema.parse(req.body);

  const results = await prisma.$transaction(
    adjustments.map((adjustment) =>
      prisma.inventoryLog.create({
        data: {
          productId: adjustment.productId,
          change: adjustment.change,
          reason: adjustment.reason,
          adminId,
        },
      })
    )
  );

  return successResponse(
    res,
    results,
    "Bulk update completed successfully",
    201
  );
});

export const getInventoryLogs = asyncHandler(async (req, res) => {
  const { productId } = inventoryIdParamSchema.parse(req.params);
  const {
    page = 1,
    limit = 10,
    sortBy = "newest",
  } = inventoryLogQuerySchema.parse(req.query);

  const skip = (page - 1) * limit;
  const orderBy =
    sortBy === "newest" ? { createdAt: "desc" } : { createdAt: "asc" };

  const [logs, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where: { productId: Number(productId) },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.inventoryLog.count({
      where: { productId: Number(productId) },
    }),
  ]);

  return successResponse(
    res,
    {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Inventory logs retrieved successfully"
  );
});

export const getInventoryLogById = asyncHandler(async (req, res) => {
  const { logId } = logIdParamSchema.parse(req.params);

  const log = await prisma.inventoryLog.findUnique({
    where: { id: Number(logId) },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
  });

  if (!log) {
    return errorResponse(res, "Inventory log not found", 404);
  }

  return successResponse(res, log, "Inventory log retrieved successfully");
});

export const getAdminInventoryLogs = asyncHandler(async (req, res) => {
  const { adminId } = adminIdParamSchema.parse(req.params);
  const {
    page = 1,
    limit = 10,
    sortBy = "newest",
  } = inventoryLogQuerySchema.parse(req.query);

  const skip = (page - 1) * limit;
  const orderBy =
    sortBy === "newest" ? { createdAt: "desc" } : { createdAt: "asc" };

  const [logs, total] = await Promise.all([
    prisma.inventoryLog.findMany({
      where: { adminId: Number(adminId) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.inventoryLog.count({
      where: { adminId: Number(adminId) },
    }),
  ]);

  return successResponse(
    res,
    {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Admin inventory logs retrieved successfully"
  );
});

export const getLowStockItems = asyncHandler(async (req, res) => {
  const lowStockItems = await prisma.inventory.findMany({
    where: {
      quantity: {
        lte: 10, // Adjust threshold as needed
      },
    },
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
  });

  return successResponse(
    res,
    lowStockItems,
    "Low stock items retrieved successfully"
  );
});
