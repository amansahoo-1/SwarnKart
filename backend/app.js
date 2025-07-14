import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  ensureConnection,
  checkNeonConnection,
} from "./client/prismaClient.js";
import prisma from "./client/prismaClient.js";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

// Config initialization
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// Enhanced security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", CLIENT_URL],
      },
    },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later",
  })
);

app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(morgan(NODE_ENV === "development" ? "dev" : "combined"));

// Enhanced health check
app.get("/health", async (req, res) => {
  try {
    const [dbStatus, uptime] = await Promise.all([
      checkNeonConnection(),
      process.uptime(),
    ]);

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: `${uptime.toFixed(2)} seconds`,
      database: dbStatus ? "connected" : "disconnected",
      environment: NODE_ENV,
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: "Service unavailable",
      details: NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// API Routes with improved error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get(
  "/api/users",
  asyncHandler(async (req, res) => {
    const prisma = await ensureConnection();
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.json({ status: "success", data: users });
  })
);

app.get(
  "/api/users/:userId",
  asyncHandler(async (req, res) => {
    const prisma = await ensureConnection();
    const userId = Number(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    user
      ? res.json({ status: "success", data: user })
      : res.status(404).json({ status: "fail", message: "User not found" });
  })
);

app.post(
  "/api/users",
  asyncHandler(async (req, res) => {
    const prisma = await ensureConnection();
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields",
      });
    }

    const newUser = await prisma.user.create({
      data: { name, email, password },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    res.status(201).json({ status: "success", data: newUser });
  })
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);

  if (err.code === "P2002") {
    return res.status(409).json({
      status: "fail",
      message: "Conflict - duplicate entry",
    });
  }

  res.status(500).json({
    status: "error",
    message: "Internal server error",
    ...(NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
});

// Server initialization
const server = app.listen(PORT, async () => {
  try {
    await ensureConnection();
    console.log(`
      🚀 Server running in ${NODE_ENV} mode
      📡 Port: ${PORT}
      🌐 Client URL: ${CLIENT_URL}
      🗄️ Database: ${process.env.DATABASE_URL?.split("@")[1]?.split("?")[0]}
    `);
  } catch (error) {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  }
});

// Graceful shutdown
const shutdown = async () => {
  console.log("\n🛑 Shutting down gracefully...");
  try {
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    console.log("💤 Server stopped");
    process.exit(0);
  } catch (err) {
    console.error("Shutdown error:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
