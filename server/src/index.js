// =====================================================================
// server/src/index.js
// Menjalankan backend API Rosita Salon di laptop (npm run dev).
// Di Vercel file ini tidak dipakai — Vercel memakai api/index.js.
// =====================================================================
import app from "./app.js";
import { testConnection } from "./db.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`🚀 Rosita Salon API jalan di http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("ℹ️  GEMINI_API_KEY belum diisi — fitur AI Asisten dinonaktifkan.");
  }
  await testConnection();
});
