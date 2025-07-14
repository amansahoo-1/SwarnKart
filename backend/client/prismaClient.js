import { PrismaClient } from "../generated/prisma/client.js";

// Configuration constants
const CONNECTION_TIMEOUT = 15; // Increased for Neon cold starts
const POOL_TIMEOUT = 10;
const MAX_RETRIES = 5; // Increased retry attempts
const RETRY_DELAY = 2500; // ms (with exponential backoff)

// Enhanced Neon-optimized Prisma Client
const prisma = new PrismaClient({
  log: [
    process.env.NODE_ENV === "development" ? "query" : "warn",
    "info",
    "warn",
    "error",
  ],
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL +
        `&connect_timeout=${CONNECTION_TIMEOUT}` +
        `&pool_timeout=${POOL_TIMEOUT}` +
        `&connection_limit=20`, // Increased for better pooling
    },
  },
  __internal: {
    engine: {
      enableConnectionPooling: true,
      useUds: false,
      allowExitOnIdle: true,
    },
  },
});

// Connection state with exponential backoff
let isConnected = false;
let connectionRetries = 0;

export async function ensureConnection() {
  if (isConnected) return prisma;

  try {
    await prisma.$connect();
    isConnected = true;
    connectionRetries = 0;
    console.log("✅ Prisma connected to Neon DB");
    return prisma;
  } catch (error) {
    const attempt = connectionRetries + 1;
    console.error(`❌ Connection attempt ${attempt}/${MAX_RETRIES} failed`);

    if (attempt < MAX_RETRIES) {
      connectionRetries++;
      const delay = Math.min(RETRY_DELAY * Math.pow(2, attempt - 1), 30000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return ensureConnection();
    }

    console.error("💥 Maximum connection retries reached");
    throw new Error(`Database connection failed after ${MAX_RETRIES} attempts`);
  }
}

export async function checkNeonConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

// Enhanced shutdown handler
const shutdownHandlers = ["beforeExit", "SIGTERM", "SIGINT", "SIGUSR2"];
shutdownHandlers.forEach((event) => {
  process.on(event, async () => {
    if (!isConnected) return;

    try {
      await prisma.$disconnect();
      isConnected = false;
      console.log("🚪 Prisma connection closed gracefully");
    } catch (error) {
      console.error("Shutdown error:", error);
    } finally {
      if (event !== "beforeExit") process.exit(0);
    }
  });
});

// Initialize with periodic health checks
// Change this in prismaClient.js
(async () => {
  if (!isConnected) {
    // Add this check
    try {
      await ensureConnection();
      setInterval(async () => {
        if (!(await checkNeonConnection())) {
          console.log("Reconnecting...");
          isConnected = false;
          await ensureConnection();
        }
      }, 300000);
    } catch (error) {
      console.error("Initialization failed:", error);
      process.exit(1);
    }
  }
})();

export default prisma;
