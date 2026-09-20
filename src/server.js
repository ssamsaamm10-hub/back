import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { migrate } from "./db/migrate.js";
import { seed } from "./db/seed.js";
import authRoutes from "./routes/auth.routes.js";
import childrenRoutes from "./routes/children.routes.js";
import contentRoutes from "./routes/content.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import parentRoutes from "./routes/parent.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

migrate();
seed();

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// General-purpose request throttle across the whole API, on top of the
// dedicated per-user token bucket on the AI route.
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/children", childrenRoutes);
// Progress endpoints are nested under /api/children/:childId/... but live in
// their own router/file for readability.
app.use("/api/children", progressRoutes);
app.use("/api/children", parentRoutes);
app.use("/api", contentRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`ReadEasy Arabic backend listening on http://localhost:${PORT}`);
});
