import app from "./app.js";
import { PrismaClient } from "@prisma/client";
import { ensureConnection } from "./client/prismaClient.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const NODE_ENV = process.env.NODE_ENV || "development";
const prisma = new PrismaClient();

const getDatabaseInfo = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return undefined;
  try {
    return dbUrl.split("@")[1]?.split("?")[0];
  } catch {
    return undefined;
  }
};

const printStartupInfo = (info) => {
  console.log(`
    🚀 Server running in ${info.environment} mode
    📡 Port: ${info.port}
    🌐 Client URL: ${info.clientUrl || "Not configured"}
    🗄️ Database: ${info.databaseInfo || "Not configured"}
  `);
};

const server = app.listen(PORT, async () => {
  try {
    await ensureConnection();
    printStartupInfo({
      port: PORT,
      environment: NODE_ENV,
      clientUrl: process.env.CLIENT_URL,
      databaseInfo: getDatabaseInfo(),
    });
  } catch (error) {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  }
});

// Graceful shutdown handler
const shutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  try {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    await prisma.$disconnect();
    console.log("💤 Server stopped");
    process.exit(0);
  } catch (err) {
    console.error("Shutdown error:", err);
    process.exit(1);
  }
};

// Signal handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Export for testing purposes
export { server, shutdown };
