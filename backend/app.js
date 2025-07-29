import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";
import Initrouter from "./routes/initRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import cartRouter from "./routes/cartRoutes.js";
import inventoryRouter from "./routes/inventoryRoutes.js";
import productRouter from "./routes/productRoute.js";
import orderRouter from "./routes/orderRoutes.js";
import wishlistRouter from "./routes/wishlistRoutes.js";
import settingsRouter from "./routes/settingsRoutes.js";
import dashboardRouter from "./routes/dashboardRoutes.js";
import reviewRouter from "./routes/reviewRoutes.js";
import discountRouter from "./routes/discountRoutes.js";

// Config initialization
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// Helmet configuration
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", CLIENT_URL],
    },
  },
};

// Rate limiting configuration
const limiterOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
};

// Middleware
app.use(helmet(helmetOptions));
app.use(rateLimit(limiterOptions));

// CORS configuration
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

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// API Routes
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/init", Initrouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/product", productRouter);
app.use("/api/order", orderRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/discount", discountRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Server initialization
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
  });
}

export default app;
