// server.js  (or index.js — wherever your Express app is bootstrapped)
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve }      from "path";

// ── Manual .env loader (keeps your existing approach) ──────────────────────
const envPath    = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf8");
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && key.trim() && !key.startsWith("#")) {
    process.env[key.trim()] = vals.join("=").trim();
  }
});

import express        from "express";
import cors           from "cors";
import connectDB      from "./config/database.js";
import authRoutes     from "./routes/authRoutes.js";
import adminRoutes    from "./routes/adminRoutes.js";
import inventoryRoutes from "./routes/inventory.js";
import salesRoutes    from "./routes/salesRoutes.js";
import { authenticateToken } from "./middleware/auth.js";
import paymentRoutes  from "./routes/paymentRoutes.js";
import chatbotRoutes  from "./routes/chatbotRoutes.js";
import emailRoutes    from "./routes/emailRoutes.js";

const app = express();

// ── IMPORTANT: Stripe webhook needs raw body — must come BEFORE express.json()
app.use(
  "/api/payment/stripe/webhook",
  express.raw({ type: "application/json" })
);

// ── Global middleware ───────────────────────────────────────────────────────
app.use(express.json());
app.use(cors());

console.log(
  `🔑 JWT_SECRET loaded:`,
  process.env.JWT_SECRET ? "✅ YES" : "❌ NO"
);

// ── Public routes (no auth required) ───────────────────────────────────────
// Chatbot MUST be mounted before any /api authenticateToken wrappers.
// Unmatched /api/chatbot/* is terminated inside chatbotRoutes (no fallthrough to admin auth).
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/email",   emailRoutes);

// ── Auth routes (register / login / verify-email / resend-verification) ────
app.use("/", authRoutes);

// ── Payment routes — PUBLIC, no authenticateToken wrapper ──────────────────
// The /api/payment/stripe/create-session endpoint must be reachable
// right after register+verify, before any protected-route middleware.
app.use("/api", paymentRoutes);

// ── Protected routes ────────────────────────────────────────────────────────
app.use("/api", adminRoutes);
app.use("/api", authenticateToken, inventoryRoutes);
app.use("/api", authenticateToken, salesRoutes);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "OK", message: "Server is running" })
);

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
connectDB();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🔑 JWT_SECRET loaded:`,
    process.env.JWT_SECRET ? "✅ YES" : "❌ NO"
  );
  console.log(
    `🤖 OpenRouter Key:`,
    process.env.OPENROUTER_API_KEY ? "✅ YES" : "❌ NO"
  );
});