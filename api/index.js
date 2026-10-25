// =====================================================================
// api/index.js
// Entry point Vercel Serverless Function. Semua request /api/* diarahkan
// ke sini (lihat vercel.json), lalu ditangani aplikasi Express yang sama
// dengan yang dipakai saat development di laptop (server/src/app.js).
// =====================================================================
import app from "../server/src/app.js";

export default app;
