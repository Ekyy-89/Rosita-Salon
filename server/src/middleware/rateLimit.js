// =====================================================================
// server/src/middleware/rateLimit.js
// Rate limiter sederhana (in-memory, fixed window) untuk mencegah
// brute force login, spam registrasi/testimoni, dan penyalahgunaan AI.
// Cukup untuk 1 proses server; kalau nanti di-scale, ganti ke Redis.
// =====================================================================

/**
 * @param {object} opts
 * @param {number} opts.windowMs   panjang jendela waktu (ms)
 * @param {number} opts.max        maksimal request per jendela
 * @param {string} opts.message    pesan error saat limit tercapai
 * @param {(req) => string} [opts.keyBy]  default: IP address
 */
export function rateLimit({ windowMs, max, message, keyBy }) {
  const hits = new Map();

  // Bersihkan entry kedaluwarsa secara berkala supaya Map tidak membengkak
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyBy ? keyBy(req) : req.ip;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Kunci per user yang login (dipakai setelah requireAuth), fallback ke IP
export const byUser = (req) => (req.user ? `user:${req.user.id}` : req.ip);
