// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./client/prismaClient.js";
import path from "path";
import { fileURLToPath } from "url";

// Load root .env for shared config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// ✅ Enable proper CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL, // http://localhost:3000
    credentials: true, // needed if you use cookies/session later
  })
);

// ✅ JSON parser
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.send("🧬 SwarnKart Backend API is running!");
});

// Example API route
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
