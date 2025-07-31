import prisma from "../client/prismaClient.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  dashboardFilterSchema,
  dashboardExportSchema,
} from "../validations/dashboard.validation.js";
import {
  successResponse,
  errorResponse,
} from "../middleware/errorMiddleware.js";
import { Role } from "../generated/prisma/index.js";
import { generateExcel } from "../utils/excelGenerator.js";
import { generateCSV } from "../utils/csvGenerator.js";

// Helper function to format time series data
const formatTimeSeries = (data, interval) => {
  const formatMap = {
    hourly: "YYYY-MM-DD HH:00",
    daily: "YYYY-MM-DD",
    weekly: "YYYY-[W]WW",
    monthly: "YYYY-MM",
    yearly: "YYYY",
  };
  return data.map((item) => ({
    ...item,
    period: formatDate(item.period, formatMap[interval] || "YYYY-MM-DD"),
  }));
};

/**
 * @desc    Get key dashboard metrics
 * @route   GET /api/dashboard/metrics
 * @access  Private/Admin
 */
export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const filters = dashboardFilterSchema.parse(req.query);

  const [orders, products, users, revenue] = await Promise.all([
    // Order metrics
    prisma.$queryRaw`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as completed_orders,
        SUM(total_amount) as total_revenue
      FROM "Order"
      WHERE
        ${filters.startDate ? Prisma.sql`created_at >= ${new Date(filters.startDate)}` : Prisma.sql`1=1`}
        AND ${filters.endDate ? Prisma.sql`created_at <= ${new Date(filters.endDate)}` : Prisma.sql`1=1`}
        AND ${filters.adminId ? Prisma.sql`admin_id = ${filters.adminId}` : Prisma.sql`1=1`}
    `,

    // Product metrics
    prisma.product.count(),

    // User metrics
    prisma.user.count(),

    // Revenue time series
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${filters.interval || "day"}, created_at) as period,
        SUM(total_amount) as revenue
      FROM "Order"
      WHERE status = 'DELIVERED'
        AND ${filters.startDate ? Prisma.sql`created_at >= ${new Date(filters.startDate)}` : Prisma.sql`1=1`}
        AND ${filters.endDate ? Prisma.sql`created_at <= ${new Date(filters.endDate)}` : Prisma.sql`1=1`}
      GROUP BY period
      ORDER BY period
      LIMIT ${filters.limit}
    `,
  ]);

  const metrics = {
    orders: {
      total: Number(orders[0].total_orders),
      completed: Number(orders[0].completed_orders),
      revenue: Number(orders[0].total_revenue),
    },
    products: {
      total: products,
    },
    users: {
      total: users,
    },
    revenueTrend: formatTimeSeries(revenue, filters.interval),
  };

  return successResponse(res, metrics, "Dashboard metrics retrieved");
});

/**
 * @desc    Get sales analytics data
 * @route   GET /api/dashboard/sales
 * @access  Private/Admin
 */
export const getSalesAnalytics = asyncHandler(async (req, res) => {
  const filters = dashboardFilterSchema.parse(req.query);

  const [byProduct, byCategory, overTime] = await Promise.all([
    // Sales by product
    prisma.$queryRaw`
      SELECT
        p.id,
        p.name,
        COUNT(oi.id) as items_sold,
        SUM(oi.price * oi.quantity) as revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON oi.product_id = p.id
      JOIN "Order" o ON oi.order_id = o.id
      WHERE o.status = 'DELIVERED'
        AND ${filters.startDate ? Prisma.sql`o.created_at >= ${new Date(filters.startDate)}` : Prisma.sql`1=1`}
        AND ${filters.endDate ? Prisma.sql`o.created_at <= ${new Date(filters.endDate)}` : Prisma.sql`1=1`}
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT ${filters.limit}
    `,

    // Sales by category
    prisma.$queryRaw`
      SELECT
        c.id,
        c.name,
        COUNT(oi.id) as items_sold,
        SUM(oi.price * oi.quantity) as revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON oi.product_id = p.id
      JOIN "Category" c ON p.category_id = c.id
      JOIN "Order" o ON oi.order_id = o.id
      WHERE o.status = 'DELIVERED'
        AND ${filters.startDate ? Prisma.sql`o.created_at >= ${new Date(filters.startDate)}` : Prisma.sql`1=1`}
        AND ${filters.endDate ? Prisma.sql`o.created_at <= ${new Date(filters.endDate)}` : Prisma.sql`1=1`}
      GROUP BY c.id
      ORDER BY revenue DESC
    `,

    // Sales over time
    prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${filters.interval || "day"}, o.created_at) as period,
        COUNT(o.id) as orders,
        SUM(oi.price * oi.quantity) as revenue
      FROM "Order" o
      JOIN "OrderItem" oi ON o.id = oi.order_id
      WHERE o.status = 'DELIVERED'
        AND ${filters.startDate ? Prisma.sql`o.created_at >= ${new Date(filters.startDate)}` : Prisma.sql`1=1`}
        AND ${filters.endDate ? Prisma.sql`o.created_at <= ${new Date(filters.endDate)}` : Prisma.sql`1=1`}
      GROUP BY period
      ORDER BY period
      LIMIT ${filters.limit}
    `,
  ]);

  const analytics = {
    byProduct: byProduct.map((p) => ({
      ...p,
      items_sold: Number(p.items_sold),
      revenue: Number(p.revenue),
    })),
    byCategory: byCategory.map((c) => ({
      ...c,
      items_sold: Number(c.items_sold),
      revenue: Number(c.revenue),
    })),
    overTime: formatTimeSeries(overTime, filters.interval),
  };

  return successResponse(res, analytics, "Sales analytics retrieved");
});

/**
 * @desc    Export data for BI tools
 * @route   POST /api/dashboard/export
 * @access  Private/Admin
 */
export const exportData = asyncHandler(async (req, res) => {
  const { type, filters } = dashboardExportSchema.parse(req.body);

  let data;
  switch (type) {
    case "orders":
      data = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: filters?.startDate ? new Date(filters.startDate) : undefined,
            lte: filters?.endDate ? new Date(filters.endDate) : undefined,
          },
          adminId: filters?.adminId,
        },
        include: {
          items: true,
          user: true,
        },
      });
      break;
    case "products":
      data = await prisma.product.findMany({
        where: {
          categoryId: filters?.categoryId,
        },
        include: {
          inventory: true,
          reviews: true,
        },
      });
      break;
    case "users":
      data = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: filters?.startDate ? new Date(filters.startDate) : undefined,
            lte: filters?.endDate ? new Date(filters.endDate) : undefined,
          },
        },
        include: {
          orders: true,
        },
      });
      break;
    case "inventory":
      data = await prisma.inventory.findMany({
        where: {
          product: {
            categoryId: filters?.categoryId,
          },
        },
        include: {
          product: true,
          logs: {
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
        },
      });
      break;
  }

  // Handle different export formats
  switch (filters?.format) {
    case "csv":
      const csv = generateCSV(data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}_export.csv`
      );
      return res.send(csv);

    case "excel":
      const excel = await generateExcel(data, type);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${type}_export.xlsx`
      );
      return res.send(excel);

    default:
      return successResponse(res, data, "Data exported successfully");
  }
});

/**
 * @desc    Get real-time dashboard updates
 * @route   GET /api/dashboard/realtime
 * @access  Private/Admin
 */
export const getRealtimeUpdates = asyncHandler(async (req, res) => {
  // This would typically connect to WebSockets or Server-Sent Events
  // For demo purposes, we'll return recent activities

  const activities = await prisma.activityLog.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const stats = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*) FROM "Order" WHERE created_at > NOW() - INTERVAL '1 hour') as recent_orders,
      (SELECT COUNT(*) FROM "User" WHERE created_at > NOW() - INTERVAL '1 day') as new_users,
      (SELECT SUM(total_amount) FROM "Order" WHERE created_at > NOW() - INTERVAL '1 day') as daily_revenue
  `;

  return successResponse(
    res,
    {
      activities,
      stats: {
        recentOrders: Number(stats[0].recent_orders),
        newUsers: Number(stats[0].new_users),
        dailyRevenue: Number(stats[0].daily_revenue),
      },
    },
    "Realtime data retrieved"
  );
});
