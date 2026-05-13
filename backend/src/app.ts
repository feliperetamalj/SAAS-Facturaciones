import express from "express";
import cors from "cors";
import path from "path";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin/index.js";
import tenantRouter from "./routes/tenant.js";
import boardRouter from "./routes/board.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173", credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Servir PDFs estáticos
  const storagePath = path.resolve(process.env.STORAGE_PATH ?? "./storage");
  app.use("/storage", express.static(storagePath));

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/tenant", tenantRouter);
  app.use("/api/board", boardRouter);

  app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date() }));

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Error interno del servidor" });
  });

  return app;
}
