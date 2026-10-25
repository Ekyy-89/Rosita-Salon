// =====================================================================
// server/src/routes/reservations.routes.js
// =====================================================================
import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { rateLimit, byUser } from "../middleware/rateLimit.js";
import { cleanText, normalizePhone } from "../utils/validate.js";
import {
  SLOT_TIMES,
  SLOT_CAPACITY,
  SLOT_DURATION_MINUTES,
  MAX_DAYS_AHEAD,
  todayWIB,
  nowTimeWIB,
  addDays,
  addMinutes,
  isValidDateString,
  getAvailability,
} from "../utils/slots.js";

const router = Router();

// Maksimal reservasi aktif (pending/confirmed, belum lewat) per customer,
// supaya satu akun tidak bisa "memborong" semua slot.
const MAX_ACTIVE_PER_CUSTOMER = 3;

const ACTIVE_STATUSES = ["pending", "confirmed"];

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Terlalu banyak percobaan reservasi. Coba lagi nanti.",
  keyBy: byUser,
});

// Validasi tanggal & jam slot. Return pesan error, atau null kalau valid.
function validateSlot(date, time) {
  if (!isValidDateString(date)) return "Format tanggal tidak valid.";
  const today = todayWIB();
  if (date < today) return "Tanggal reservasi sudah lewat.";
  if (date > addDays(today, MAX_DAYS_AHEAD)) {
    return `Reservasi hanya bisa dibuat maksimal ${MAX_DAYS_AHEAD} hari ke depan.`;
  }
  if (!SLOT_TIMES.includes(time)) return "Jam yang dipilih di luar jadwal operasional salon.";
  return null;
}

// Jalankan fn(client) dalam transaksi sambil mengunci slot tertentu, supaya dua
// request yang mengisi slot yang sama tidak bisa lolos bersamaan (anti double
// booking). Kunci (advisory lock) otomatis lepas saat transaksi selesai.
function withSlotLock(date, time, fn) {
  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`rosita_slot_${date}_${time}`]);
    return fn(client);
  });
}

async function isSlotAvailable(client, date, time) {
  const slots = await getAvailability(date, client);
  return Boolean(slots.find((s) => s.time === time)?.available);
}

const SLOT_FULL_ERROR = "Maaf, slot jam ini sudah penuh / sudah lewat. Silakan pilih jam lain.";

const httpError = (status, message) => Object.assign(new Error(message), { status });

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sendError(res, err, fallback) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: fallback });
}

// Semua endpoint reservasi WAJIB login
router.use(requireAuth);

// -------------------------------------------------
// GET /api/reservations/availability?date=YYYY-MM-DD
// Daftar slot jam + sisa kuota untuk tanggal tertentu
// -------------------------------------------------
router.get("/availability", async (req, res) => {
  try {
    const date = cleanText(req.query.date);
    if (!isValidDateString(date)) {
      return res.status(400).json({ error: "Format tanggal tidak valid." });
    }
    const slots = await getAvailability(date);
    res.json({ date, capacity: SLOT_CAPACITY, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil jadwal kosong." });
  }
});

// -------------------------------------------------
// POST /api/reservations
// Customer membuat reservasi baru. Admin juga bisa, untuk mencatat
// pelanggan yang datang langsung / booking lewat telepon (walk-in).
// -------------------------------------------------
// Admin tidak kena limit (bisa input banyak pelanggan walk-in sekaligus)
const limitCustomers = (req, res, next) =>
  req.user.role === "admin" ? next() : createLimiter(req, res, next);

router.post("/", limitCustomers, async (req, res) => {
  const isAdmin = req.user.role === "admin";
  const customerName = cleanText(req.body.customerName);
  const whatsapp = normalizePhone(req.body.whatsapp);
  const serviceName = cleanText(req.body.serviceName);
  const date = cleanText(req.body.date);
  const time = cleanText(req.body.time).slice(0, 5);
  const notes = cleanText(req.body.notes);
  // Reservasi dari admin boleh langsung terkonfirmasi
  const status = isAdmin && req.body.status === "confirmed" ? "confirmed" : "pending";

  // ---- Validasi input ----
  if (!customerName || !req.body.whatsapp || !serviceName || !date || !time) {
    return res.status(400).json({ error: "Semua data reservasi wajib diisi." });
  }
  if (customerName.length < 2 || customerName.length > 100) {
    return res.status(400).json({ error: "Nama harus 2 - 100 karakter." });
  }
  if (!whatsapp) {
    return res.status(400).json({ error: "Nomor WhatsApp tidak valid. Contoh: 081234567890" });
  }
  if (serviceName.length > 150) {
    return res.status(400).json({ error: "Nama layanan terlalu panjang." });
  }
  if (notes.length > 500) {
    return res.status(400).json({ error: "Catatan maksimal 500 karakter." });
  }
  const slotError = validateSlot(date, time);
  if (slotError) return res.status(400).json({ error: slotError });

  // ---- Cek kuota & simpan ----
  try {
    const reservation = await withSlotLock(date, time, async (client) => {
      if (!isAdmin) {
        const { rows } = await client.query(
          `SELECT COUNT(*) AS active FROM reservations
           WHERE user_id = $1 AND status = ANY($2) AND reservation_date >= $3`,
          [req.user.id, ACTIVE_STATUSES, todayWIB()]
        );
        const { active } = rows[0];
        if (active >= MAX_ACTIVE_PER_CUSTOMER) {
          throw httpError(
            409,
            `Kamu sudah punya ${active} reservasi aktif. Selesaikan atau batalkan dulu salah satunya.`
          );
        }
      }

      if (!(await isSlotAvailable(client, date, time))) {
        throw httpError(409, SLOT_FULL_ERROR);
      }

      const { rows } = await client.query(
        `INSERT INTO reservations
          (user_id, customer_name, whatsapp, service_name, reservation_date, reservation_time, end_time, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          req.user.id,
          customerName,
          whatsapp,
          serviceName,
          date,
          `${time}:00`,
          `${addMinutes(time, SLOT_DURATION_MINUTES)}:00`,
          notes || null,
          status,
        ]
      );
      return rows[0];
    });

    res.status(201).json({ reservation });
  } catch (err) {
    sendError(res, err, "Gagal menyimpan reservasi. Coba lagi nanti.");
  }
});

// -------------------------------------------------
// GET /api/reservations
// Admin -> lihat semua reservasi (join info email pemesan)
// Customer -> lihat reservasi miliknya sendiri saja
// -------------------------------------------------
router.get("/", async (req, res) => {
  try {
    const { rows } =
      req.user.role === "admin"
        ? await pool.query(
            `SELECT r.*, u.email AS user_email, u.role AS created_by_role
             FROM reservations r
             JOIN users u ON u.id = r.user_id
             ORDER BY r.reservation_date DESC, r.reservation_time DESC, r.id DESC`
          )
        : await pool.query(
            `SELECT * FROM reservations
             WHERE user_id = $1
             ORDER BY reservation_date DESC, reservation_time DESC, id DESC`,
            [req.user.id]
          );

    res.json({ reservations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal mengambil data reservasi." });
  }
});

// -------------------------------------------------
// PATCH /api/reservations/:id/status   (admin)
// Aturan perubahan status:
// - "done" hanya untuk reservasi hari ini / yang sudah lewat
// - Memulihkan reservasi batal/selesai jadi aktif lagi dicek kuota slotnya dulu
// -------------------------------------------------
router.patch("/:id/status", requireRole("admin"), async (req, res) => {
  const id = parseId(req.params.id);
  const { status } = req.body;
  const allowed = ["pending", "confirmed", "cancelled", "done"];

  if (!id) return res.status(400).json({ error: "ID reservasi tidak valid." });
  if (!allowed.includes(status)) return res.status(400).json({ error: "Status tidak valid." });

  try {
    const { rows } = await pool.query("SELECT * FROM reservations WHERE id = $1", [id]);
    const current = rows[0];
    if (!current) {
      return res.status(404).json({ error: "Reservasi tidak ditemukan." });
    }
    if (current.status === status) {
      return res.json({ reservation: current });
    }

    const date = current.reservation_date;
    const time = current.reservation_time.slice(0, 5);

    if (status === "done" && date > todayWIB()) {
      return res
        .status(400)
        .json({ error: "Reservasi yang belum tiba tanggalnya tidak bisa ditandai selesai." });
    }

    const reactivating = ACTIVE_STATUSES.includes(status) && !ACTIVE_STATUSES.includes(current.status);
    const updateStatus = async (client) => {
      const { rows: updated } = await client.query(
        "UPDATE reservations SET status = $1 WHERE id = $2 RETURNING *",
        [status, id]
      );
      return updated[0];
    };

    const reservation = reactivating
      ? await withSlotLock(date, time, async (client) => {
          const today = todayWIB();
          if (date < today || (date === today && time <= nowTimeWIB())) {
            throw httpError(400, "Jadwal reservasi ini sudah lewat, tidak bisa dipulihkan. Buat reservasi baru saja.");
          }
          if (!(await isSlotAvailable(client, date, time))) {
            throw httpError(409, "Slot jam ini sudah penuh, reservasi tidak bisa dipulihkan. Ubah jadwalnya dulu.");
          }
          return updateStatus(client);
        })
      : await updateStatus(pool);

    res.json({ reservation });
  } catch (err) {
    sendError(res, err, "Gagal mengubah status reservasi.");
  }
});

// -------------------------------------------------
// PATCH /api/reservations/:id/schedule   (admin)
// Pindahkan reservasi ke tanggal/jam lain (misal customer minta reschedule via WA)
// body: { date: "YYYY-MM-DD", time: "HH:MM" }
// -------------------------------------------------
router.patch("/:id/schedule", requireRole("admin"), async (req, res) => {
  const id = parseId(req.params.id);
  const date = cleanText(req.body.date);
  const time = cleanText(req.body.time).slice(0, 5);

  if (!id) return res.status(400).json({ error: "ID reservasi tidak valid." });
  const slotError = validateSlot(date, time);
  if (slotError) return res.status(400).json({ error: slotError });

  try {
    const reservation = await withSlotLock(date, time, async (client) => {
      const { rows } = await client.query("SELECT * FROM reservations WHERE id = $1", [id]);
      const current = rows[0];
      if (!current) throw httpError(404, "Reservasi tidak ditemukan.");
      if (!ACTIVE_STATUSES.includes(current.status)) {
        throw httpError(400, "Hanya reservasi yang masih aktif (menunggu/terkonfirmasi) yang bisa dipindah.");
      }
      if (current.reservation_date === date && current.reservation_time.slice(0, 5) === time) {
        throw httpError(400, "Jadwal baru sama dengan jadwal sekarang.");
      }
      if (!(await isSlotAvailable(client, date, time))) {
        throw httpError(409, SLOT_FULL_ERROR);
      }

      const { rows: updated } = await client.query(
        `UPDATE reservations SET reservation_date = $1, reservation_time = $2, end_time = $3
         WHERE id = $4 RETURNING *`,
        [date, `${time}:00`, `${addMinutes(time, SLOT_DURATION_MINUTES)}:00`, id]
      );
      return updated[0];
    });

    res.json({ reservation });
  } catch (err) {
    sendError(res, err, "Gagal mengubah jadwal reservasi.");
  }
});

// -------------------------------------------------
// DELETE /api/reservations/:id
// Customer boleh batalkan reservasi miliknya sendiri selama masih 'pending'.
// Data TIDAK dihapus, hanya status-nya jadi 'cancelled' supaya riwayat
// tetap tercatat untuk admin. Admin juga bisa membatalkan reservasi mana pun.
// -------------------------------------------------
router.delete("/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "ID reservasi tidak valid." });
    }

    const { rows } = await pool.query("SELECT * FROM reservations WHERE id = $1", [id]);
    const reservation = rows[0];

    // Reservasi milik orang lain dianggap "tidak ditemukan" supaya ID-nya tidak bisa ditebak-tebak
    const isOwner = reservation && reservation.user_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!reservation || (!isOwner && !isAdmin)) {
      return res.status(404).json({ error: "Reservasi tidak ditemukan." });
    }

    if (!isAdmin && reservation.status !== "pending") {
      return res
        .status(403)
        .json({ error: "Reservasi yang sudah dikonfirmasi hanya bisa dibatalkan lewat admin." });
    }

    await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal membatalkan reservasi." });
  }
});

export default router;
