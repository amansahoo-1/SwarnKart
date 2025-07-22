// backend/routes/initRoutes.js
import express from "express";
import { bootstrapSuperAdmin } from "../utils/init_admin.js";

const Initrouter = express.Router();

Initrouter.post("/init-superadmin", bootstrapSuperAdmin); // 🔒 Protect this in production!

export default Initrouter;
