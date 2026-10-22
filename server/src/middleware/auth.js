// =====================================================================
// server/src/middleware/auth.js
// =====================================================================
import { verifyToken } from "../utils/jwt.js";
import { pool } from "../db.js";

// Memastikan request punya token JWT yang valid di header Authorization.
// Role & data user diambil ulang dari database (bukan dari isi token), jadi
// kalau akun dihapus atau role-nya diubah, efeknya langsung berlaku.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Silakan login terlebih dahulu." });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: "Sesi login tidak valid atau kedaluwarsa." });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Akun tidak ditemukan. Silakan login ulang." });
    }
    req.user = rows[0]; // { id, name, email, phone, role }
    next();
  } catch (err) {
    next(err);
  }
}

// Membatasi akses hanya untuk role tertentu, dipakai setelah requireAuth
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Kamu tidak punya akses ke fitur ini." });
    }
    next();
  };
}
