// =====================================================================
// server/src/routes/testimonials.routes.js
// =====================================================================
import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { rateLimit, byUser } from "../middleware/rateLimit.js";

const router = Router();

const MAX_MESSAGE_LENGTH = 500;

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: "Kamu sudah mengirim beberapa testimoni. Coba lagi nanti ya.",
  keyBy: byUser,
});

// -------------------------------------------------
// GET /api/testimonials
// Publik, siapa saja bisa lihat (tidak perlu login)
// -------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.id, t.rating, t.message, t.created_at, u.name AS user_name
       FROM testimonials t
       JOIN users u ON u.id = t.user_id
       ORDER BY t.created_at DESC
       LIMIT 50`
    );
    res.json({ testimonials: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data testimoni." });
  }
});

// -------------------------------------------------
// POST /api/testimonials
// Wajib login untuk menulis testimoni baru
// -------------------------------------------------
router.post("/", requireAuth, createLimiter, async (req, res) => {
  try {
    const { rating } = req.body;
    const message = typeof req.body.message === "string" ? req.body.message : "";
    const ratingNum = Number(rating);

    if (!message.trim()) {
      return res.status(400).json({ error: "Komentar tidak boleh kosong." });
    }
    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return res
        .status(400)
        .json({ error: `Komentar maksimal ${MAX_MESSAGE_LENGTH} karakter.` });
    }
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: "Pilih rating bintang dulu ya." });
    }

    const { rows: inserted } = await pool.query(
      "INSERT INTO testimonials (user_id, rating, message) VALUES ($1, $2, $3) RETURNING id",
      [req.user.id, ratingNum, message.trim()]
    );

    const { rows } = await pool.query(
      `SELECT t.id, t.rating, t.message, t.created_at, u.name AS user_name
       FROM testimonials t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1`,
      [inserted[0].id]
    );

    res.status(201).json({ testimonial: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengirim testimoni. Coba lagi nanti." });
  }
});

// -------------------------------------------------
// DELETE /api/testimonials/:id   (admin)
// Hapus testimoni spam / tidak pantas supaya tidak tampil di website
// -------------------------------------------------
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID testimoni tidak valid." });
    }
    const { rowCount } = await pool.query("DELETE FROM testimonials WHERE id = $1", [id]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Testimoni tidak ditemukan." });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menghapus testimoni." });
  }
});

export default router;
