import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import chatRouter from "./routes/chat";
import "./db/seed";

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

// In production, frontend is served from same origin — no CORS needed
// In dev, allow Vite dev server
if (!isProd) {
  app.use(cors({ origin: "http://localhost:5173" }));
}

app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please wait a minute and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "You are sending messages too fast. Please wait a minute and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use("/chat/message", chatLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/chat", chatRouter);

// Serve Svelte frontend in production
if (isProd) {
  const frontendDist = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendDist));
  // All non-API routes serve the frontend (Express v5 requires named wildcard)
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// 404 handler (dev only — in prod the wildcard above handles unknown routes)
if (!isProd) {
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
  });
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/chat", chatRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`POST http://localhost:${PORT}/chat/message`);
});
