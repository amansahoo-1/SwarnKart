// backend/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prisma from "./client/prismaClient.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Basic Health Route
app.get("/", (req, res) => {
  res.send("🧬 SwarnKart Backend API is running!");
});

// Example Test Route
app.get("/api/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
