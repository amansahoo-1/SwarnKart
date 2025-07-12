import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./client/prismaClient.js";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// ======================
// Middleware Configuration
// ======================

// Security headers
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// JSON parser
app.use(express.json({ limit: "10kb" }));

// Request logging
app.use(morgan(NODE_ENV === "development" ? "dev" : "combined"));

// ======================
// Database Connection
// ======================

let isDatabaseConnected = false;

app.use(async (req, res, next) => {
  if (!isDatabaseConnected) {
    try {
      await prisma.$connect();
      isDatabaseConnected = true;
      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection error:", error);
      return res.status(503).json({
        status: "error",
        message: "Database connection failed",
        error: NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
  next();
});

// ======================
// API Routes (Fixed Patterns)
// ======================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: isDatabaseConnected ? "connected" : "disconnected",
  });
});

// Users routes (with proper parameter syntax)
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.json({ status: "success", data: users });
  } catch (error) {
    handleServerError(res, error, "fetching users");
  }
});

app.get("/api/users/:userId", async (req, res) => {
  // Fixed parameter name
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.userId) },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    user
      ? res.json({ status: "success", data: user })
      : res.status(404).json({ status: "fail", message: "User not found" });
  } catch (error) {
    handleServerError(res, error, "fetching user");
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log("succesfully inside /api/users");

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide name, email, and password",
      });
    }

    const newUser = await prisma.user.create({
      data: { name, email, password },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    res.status(201).json({ status: "success", data: newUser });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        status: "fail",
        message: "Email already exists",
      });
    }
    handleServerError(res, error, "creating user");
  }
});

// ======================
// Error Handlers
// ======================

function handleServerError(res, error, context) {
  console.error(`❌ Error ${context}:`, error);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
    ...(NODE_ENV === "development" && { error: error.message }),
  });
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: "fail",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🔥 Unhandled error:", error);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error",
    ...(NODE_ENV === "development" && { stack: error.stack }),
  });
});

// ======================
// Server Management
// ======================

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log("🛑 Shutting down gracefully...");
  await prisma.$disconnect();
  server.close(() => {
    console.log("💤 Server stopped");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (error) => {
  console.error("💥 Unhandled Rejection:", error);
  shutdown();
});
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  shutdown();
});
