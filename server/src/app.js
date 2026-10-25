// =====================================================================
// server/src/app.js
// Aplikasi Express Rosita Salon (tanpa app.listen).
// Dipakai oleh server lokal (src/index.js) dan oleh Vercel (api/index.js).
// =====================================================================
// Harus di-import paling awal supaya .env sudah terbaca sebelum modul lain jalan
import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import reservationRoutes from "./routes/reservations.routes.js";
import testimonialRoutes from "./routes/testimonials.routes.js";
import aiRoutes from "./routes/ai.routes.js";

const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// Jangan bocorkan teknologi server lewat header
app.disable("x-powered-by");

// Di belakang proxy (Vercel, nginx), baca IP asli pengunjung dari X-Forwarded-For
// supaya rate limiter tidak menganggap semua orang punya IP yang sama
if (process.env.VERCEL) app.set("trust proxy", 1);
else if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// Header keamanan dasar
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  next();
});

// CORS: izinkan alamat dari CLIENT_ORIGIN. Saat development, semua port localhost
// juga diizinkan, karena Vite otomatis pindah ke 5174, 5175, dst kalau 5173 terpakai
// (kalau tidak, browser menolak request dan muncul error "Failed to fetch").
// Di Vercel, frontend & API satu domain, jadi CORS tidak dipakai sama sekali.
const allowedOrigins = CLIENT_ORIGIN.split(",").map((o) => o.trim());
const isLocalDevOrigin = (origin) =>
  process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Request tanpa Origin (Postman, curl, server-ke-server) tidak butuh CORS
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
  })
);
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

export default app;
