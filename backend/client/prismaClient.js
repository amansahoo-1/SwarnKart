import { PrismaClient } from "../generated/prisma/client.js";

const prisma = new PrismaClient({
  log: ["warn", "error"],
  datasourceUrl: process.env.DATABASE_URL,
  // for neon
});
// Add graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export default prisma;
