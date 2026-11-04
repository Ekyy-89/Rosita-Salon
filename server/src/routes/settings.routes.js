// =====================================================================
// server/src/routes/settings.routes.js
// Pengaturan salon yang diubah admin dari dashboard (saat ini: gambar QRIS).
// Gambar disimpan di database sebagai data URL karena server Vercel tidak
// bisa menyimpan file upload secara permanen.
// =====================================================================
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// ~600 KB setelah base64; frontend sudah mengecilkan gambar sebelum upload
const MAX_IMAGE_LENGTH = 800_000;
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

router.use(requireAuth, requireRole("admin"));

// GET /api/settings/qris -> { image: "data:image/png;base64,..." | null }
router.get("/qris", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value, updated_at FROM settings WHERE key = 'qris_image'");
    res.json({ image: rows[0]?.value || null, updatedAt: rows[0]?.updated_at || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil gambar QRIS." });
  }
});

// PUT /api/settings/qris  body: { image: data URL }  (image null = hapus)
router.put("/qris", async (req, res) => {
  const { image } = req.body;
  try {
    if (image === null) {
      await pool.query("DELETE FROM settings WHERE key = 'qris_image'");
      return res.json({ image: null });
    }
    if (typeof image !== "string" || image.length > MAX_IMAGE_LENGTH || !IMAGE_DATA_URL.test(image)) {
      return res.status(400).json({ error: "Gambar QRIS harus PNG/JPG/WEBP dan maksimal ±600 KB." });
    }
    await pool.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('qris_image', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [image]
    );
    res.json({ image });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan gambar QRIS." });
  }
});

export default router;
