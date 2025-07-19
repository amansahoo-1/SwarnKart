// client/prismaClient.js

import { PrismaClient } from "../generated/prisma/client.js";

// ===🔧 Configuration Constants ===
const CONNECTION_TIMEOUT = 15; // seconds
const POOL_TIMEOUT = 10; // seconds
const CONNECTION_LIMIT = 5; // for Neon + PgBouncer
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2500; // ms for exponential backoff
const HEALTH_CHECK_INTERVAL = 300_000; // 5 minutes

// ===🌐 Construct Optimized Neon-Compatible DB URL ===
const dbUrl =
  process.env.DATABASE_URL +
  `&connect_timeout=${CONNECTION_TIMEOUT}` +
  `&pool_timeout=${POOL_TIMEOUT}` +
  `&connection_limit=${CONNECTION_LIMIT}` +
  `&pgbouncer=true` +
  `&max_idle_time=10000`; // Prevent stale idle connections

// ===🧠 Singleton Prisma Client with Enhanced Logging ===
const prisma = new PrismaClient({
  log: [
    process.env.NODE_ENV === "development" ? "query" : "warn",
    "info",
    "warn",
    "error",
  ],
  datasources: {
    db: { url: dbUrl },
  },
  __internal: {
    engine: {
      enableConnectionPooling: true,
      useUds: false,
      allowExitOnIdle: true,
    },
  },
});

// ===📡 Connection State Tracking ===
let isConnected = false;
let connectionRetries = 0;

// ===🔁 Retry Logic with Exponential Backoff ===
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
    console.error(
      `❌ Connection attempt ${attempt}/${MAX_RETRIES} failed`,
      error
    );

    if (attempt < MAX_RETRIES) {
      connectionRetries++;
      const delay = Math.min(RETRY_DELAY_MS * 2 ** (attempt - 1), 30_000);
      await new Promise((res) => setTimeout(res, delay));
      return ensureConnection();
    }

    console.error("💥 Maximum connection retries reached");
    throw new Error("Database connection failed after maximum retries.");
  }
}

// ===🧪 Realistic DB Health Check ===
export async function checkNeonConnection() {
  try {
    // Check actual queryable schema instead of just `SELECT 1`
    await prisma.user.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    console.error("🧨 Database health check failed:", error);
    return false;
  }
}

// ===🧹 Graceful Shutdown Handling ===
const shutdownEvents = ["beforeExit", "SIGINT", "SIGTERM", "SIGUSR2"];
shutdownEvents.forEach((event) => {
  process.on(event, async () => {
    if (!isConnected) return;

    try {
      await prisma.$disconnect();
      isConnected = false;
      console.log("🚪 Prisma connection closed gracefully");
    } catch (error) {
      console.error("❌ Error during shutdown:", error);
    } finally {
      if (["SIGINT", "SIGTERM"].includes(event)) process.exit(0);
    }
  });
});

// // Optional: Prisma internal exit hook
// prisma.$on("beforeExit", async () => {
//   if (isConnected) {
//     await prisma.$disconnect();
//     isConnected = false;
//     console.log("⚠️ Prisma disconnected via beforeExit hook");
//   }
// });

// ===🔄 Periodic Health Checker ===
(async () => {
  try {
    await ensureConnection();
    setInterval(async () => {
      const healthy = await checkNeonConnection();
      if (!healthy) {
        console.log("🔁 DB connection lost. Reconnecting...");
        isConnected = false;
        await ensureConnection();
      }
    }, HEALTH_CHECK_INTERVAL);
  } catch (error) {
    console.error("🚫 Prisma initialization failed:", error);
    process.exit(1);
  }
})();

export default prisma;
