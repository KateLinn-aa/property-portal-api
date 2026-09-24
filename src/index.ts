import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import authRoutes from "./routes/auth";
import listingRoutes from "./routes/listings";
import userRoutes from "./routes/users";
import adminRoutes from "./routes/admin";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/listings", listingRoutes);
app.use("/users", userRoutes);
app.use("/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Central error handler (e.g. multer errors, JSON parse errors)
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const status = err?.status || 400;
    res.status(status).json({ error: err?.message || "Something went wrong" });
  }
);

app.listen(PORT, () => {
  console.log(`property-portal-api listening on http://localhost:${PORT}`);
});
