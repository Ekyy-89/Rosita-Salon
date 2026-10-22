// =====================================================================
// server/src/index.js
// Entry point backend API Rosita Salon
// =====================================================================
// Harus di-import paling awal supaya .env sudah terbaca sebelum modul lain jalan
import "dotenv/config";
import express from "express";
import cors from "cors";
import { testConnection } from "./db.js";
import authRoutes from "./routes/auth.routes.js";
import reservationRoutes from "./routes/reservations.routes.js";
import testimonialRoutes from "./routes/testimonials.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Jangan bocorkan teknologi server lewat header
app.disable("x-powered-by");

// Kalau nanti di belakang reverse proxy (nginx/Laragon), set TRUST_PROXY=1
// supaya rate limiter membaca IP asli pengunjung
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// Header keamanan dasar
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  next();
});

app.use(cors({ origin: CLIENT_ORIGIN.split(",").map((o) => o.trim()) }));
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Rosita Salon API berjalan normal." });
});

app.use("/api/auth", authRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/ai", aiRoutes);

// Handler untuk route yang tidak ditemukan
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan." });
});

// Handler error umum
app.use((err, req, res, next) => {
  // Body JSON rusak / terlalu besar -> 400, bukan 500
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    return res.status(400).json({ error: "Data yang dikirim tidak valid." });
  }
  console.error(err);
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

app.listen(PORT, async () => {
  console.log(`🚀 Rosita Salon API jalan di http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("ℹ️  GEMINI_API_KEY belum diisi — fitur AI Asisten dinonaktifkan.");
  }
  await testConnection();
});
