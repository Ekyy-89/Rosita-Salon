// =====================================================================
// server/src/routes/auth.routes.js
// =====================================================================
import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool, withTransaction } from "../db.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { cleanText, isValidEmail, normalizePhone } from "../utils/validate.js";
import { sendMail } from "../utils/mailer.js";

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

// Lupa password: dibatasi per IP dan per email supaya inbox orang tidak di-spam
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit.",
});
const forgotEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message:
    "Link reset untuk email ini sudah dikirim beberapa kali. Cek inbox/spam, atau coba lagi dalam 15 menit.",
  keyBy: (req) => `email:${cleanText(req.body?.email).toLowerCase()}`,
});
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Terlalu banyak percobaan reset password. Coba lagi dalam 15 menit.",
});

const RESET_TOKEN_TTL_MINUTES = 30;

// Token di database disimpan dalam bentuk hash, jadi kalau database bocor
// link reset yang masih aktif tetap tidak bisa dipakai.
const hashResetToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Alamat website untuk link di email. Sengaja TIDAK diambil dari header Host
// request (bisa dipalsukan penyerang supaya link mengarah ke situs mereka).
function appUrl() {
  const url =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",")[0].trim();
  return url.replace(/\/+$/, "");
}

function resetEmail(name, link) {
  const text =
    `Halo ${name},\n\n` +
    `Kami menerima permintaan reset password untuk akun Rosita Beauty Salon kamu.\n` +
    `Buka link berikut untuk membuat password baru (berlaku ${RESET_TOKEN_TTL_MINUTES} menit):\n\n` +
    `${link}\n\n` +
    `Kalau kamu tidak meminta reset password, abaikan email ini. Password kamu tidak akan berubah.\n\n` +
    `Salam,\nRosita Beauty Salon`;
  const safeName = name.replace(/[<>&"']/g, "");
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#2b2b2b">
      <h2 style="color:#a67c37">Rosita Beauty Salon</h2>
      <p>Halo ${safeName},</p>
      <p>Kami menerima permintaan reset password untuk akun kamu. Klik tombol di bawah untuk membuat password baru. Link ini berlaku <b>${RESET_TOKEN_TTL_MINUTES} menit</b>.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}" style="background:#c9a25a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold">Buat Password Baru</a>
      </p>
      <p style="font-size:13px;color:#777">Kalau tombol tidak bisa diklik, salin link ini ke browser:<br><a href="${link}" style="color:#a67c37;word-break:break-all">${link}</a></p>
      <p style="font-size:13px;color:#777">Kalau kamu tidak meminta reset password, abaikan email ini. Password kamu tidak akan berubah.</p>
    </div>`;
  return { text, html };
}

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

    const { rows: existing } = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email ini sudah terdaftar. Silakan login." });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Role selalu 'customer' — tidak pernah diambil dari input user
    const { rows: inserted } = await pool.query(
      "INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, 'customer') RETURNING id",
      [name, email, hashed, phone]
    );

    const user = {
      id: inserted[0].id,
      name,
      email,
      phone,
      role: "customer",
    };
    const token = signToken({ id: user.id });

    res.status(201).json({ token, user });
  } catch (err) {
    // 23505 = unique violation: email sama didaftarkan bersamaan
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email ini sudah terdaftar. Silakan login." });
    }
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

    const { rows } = await pool.query(
      "SELECT id, name, email, password, phone, role FROM users WHERE email = $1",
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
// POST /api/auth/forgot-password
// Kirim link reset password ke email. Respon selalu sama, baik email
// terdaftar maupun tidak, supaya tidak bisa dipakai mengecek email orang.
// -------------------------------------------------
router.post("/forgot-password", forgotLimiter, forgotEmailLimiter, async (req, res) => {
  const email = cleanText(req.body.email).toLowerCase();
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: "Masukkan email yang valid." });
  }

  const genericResponse = {
    message:
      "Kalau email tersebut terdaftar, link reset password sudah dikirim. Cek inbox (atau folder spam) kamu.",
  };

  try {
    const { rows } = await pool.query("SELECT id, name, email FROM users WHERE email = $1", [email]);
    const user = rows[0];
    if (!user) return res.json(genericResponse);

    const token = crypto.randomBytes(32).toString("hex");
    // Link lama yang belum dipakai otomatis tidak berlaku lagi
    await withTransaction(async (client) => {
      await client.query("DELETE FROM password_resets WHERE user_id = $1", [user.id]);
      await client.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [user.id, hashResetToken(token), RESET_TOKEN_TTL_MINUTES]
      );
    });

    // Token ditaruh di bagian # URL supaya tidak ikut terkirim ke server / tercatat di log
    const link = `${appUrl()}/#reset-password=${token}`;
    await sendMail({
      to: user.email,
      subject: "Reset Password Akun Rosita Beauty Salon",
      ...resetEmail(user.name, link),
    });

    res.json(genericResponse);
  } catch (err) {
    console.error("Gagal memproses lupa password:", err);
    res.status(500).json({ error: "Gagal mengirim email reset password. Coba lagi nanti." });
  }
});

// -------------------------------------------------
// POST /api/auth/reset-password
// Ganti password memakai token dari link email, lalu langsung login.
// -------------------------------------------------
router.post("/reset-password", resetLimiter, async (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(400).json({ error: "Link reset password tidak valid." });
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 72) {
    return res
      .status(400)
      .json({ error: `Password minimal ${MIN_PASSWORD_LENGTH} karakter (maksimal 72).` });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await withTransaction(async (client) => {
      // DELETE ... RETURNING: token langsung hangus, jadi tidak bisa dipakai dua kali
      const { rows } = await client.query(
        "DELETE FROM password_resets WHERE token_hash = $1 RETURNING user_id, expires_at > now() AS valid",
        [hashResetToken(token)]
      );
      if (rows.length === 0 || !rows[0].valid) return null;

      // password_changed_at membuat semua sesi login lama (di perangkat lain) tidak berlaku
      const { rows: updated } = await client.query(
        `UPDATE users SET password = $1, password_changed_at = now()
         WHERE id = $2 RETURNING id, name, email, phone, role`,
        [hashed, rows[0].user_id]
      );
      return updated[0] || null;
    });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Link reset password sudah kedaluwarsa atau sudah dipakai. Minta link baru." });
    }

    const authToken = signToken({ id: user.id });
    res.json({ token: authToken, user, message: "Password berhasil diganti." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengganti password. Coba lagi nanti." });
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
