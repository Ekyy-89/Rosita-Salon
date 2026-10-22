// =====================================================================
// server/src/routes/auth.routes.js
// =====================================================================
import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { cleanText, isValidEmail, normalizePhone } from "../utils/validate.js";

const router = Router();

const MIN_PASSWORD_LENGTH = 8;

// Hash dummy supaya waktu respon login sama, baik email terdaftar maupun tidak
// (mencegah penyerang menebak email mana yang terdaftar dari lama respon).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-untuk-timing", 10);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Terlalu banyak pendaftaran dari perangkat ini. Coba lagi nanti.",
});

// -------------------------------------------------
// POST /api/auth/register
// Registrasi akun customer baru (bebas pakai email pribadi)
// -------------------------------------------------
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const rawPhone = cleanText(req.body.phone);

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
    }
    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({ error: "Nama harus 2 - 100 karakter." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Format email tidak valid." });
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > 72) {
      return res
        .status(400)
        .json({ error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter (maksimal 72).` });
    }

    let phone = null;
    if (rawPhone) {
      phone = normalizePhone(rawPhone);
      if (!phone) {
        return res.status(400).json({ error: "Nomor WhatsApp tidak valid. Contoh: 081234567890" });
      }
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email ini sudah terdaftar. Silakan login." });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Role selalu 'customer' — tidak pernah diambil dari input user
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, 'customer')",
      [name, email, hashed, phone]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      phone,
      role: "customer",
    };
    const token = signToken({ id: user.id });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mendaftarkan akun. Coba lagi nanti." });
  }
});

// -------------------------------------------------
// POST /api/auth/login
// Login untuk admin maupun customer (dibedakan lewat kolom role)
// -------------------------------------------------
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const email = cleanText(req.body.email).toLowerCase();
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi." });
    }

    const [rows] = await pool.query(
      "SELECT id, name, email, password, phone, role FROM users WHERE email = ?",
      [email]
    );
    const userRow = rows[0];

    const isMatch = await bcrypt.compare(password, userRow ? userRow.password : DUMMY_HASH);
    if (!userRow || !isMatch) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      role: userRow.role,
    };
    // Token cukup berisi id; role dicek ulang dari database di setiap request
    const token = signToken({ id: user.id });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal login. Coba lagi nanti." });
  }
});

// -------------------------------------------------
// GET /api/auth/me
// Ambil data akun yang sedang login (untuk restore session di frontend)
// -------------------------------------------------
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
