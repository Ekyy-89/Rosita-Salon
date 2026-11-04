// =====================================================================
// server/src/routes/payments.routes.js
// Kasir (POS) salon: pembayaran Cash / QRIS setelah treatment selesai.
// Transaksi bisa berasal dari reservasi online (booking) atau pelanggan
// yang datang langsung (walk-in). Semua tersimpan di tabel yang sama,
// jadi laporan penjualan & riwayat customer selalu sinkron.
// =====================================================================
import { Router } from "express";
import { pool, withTransaction } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { cleanText, normalizePhone } from "../utils/validate.js";
import {
  SLOT_CAPACITY,
  SLOT_DURATION_MINUTES,
  todayWIB,
  addMinutes,
  isValidDateString,
  currentSlotWIB,
} from "../utils/slots.js";

const router = Router();

const METHODS = ["cash", "qris"];
const MAX_ITEMS = 20;
const MAX_PRICE = 10_000_000;

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, extra });

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sendError(res, err, fallback) {
  if (err.status) return res.status(err.status).json({ error: err.message, ...err.extra });
  console.error(err);
  res.status(500).json({ error: fallback });
}

const isMoney = (n, max = MAX_PRICE) => Number.isInteger(n) && n >= 0 && n <= max;

// Validasi & rapikan daftar layanan dari kasir. Return { items, subtotal }.
function parseItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw httpError(400, "Tambahkan minimal satu layanan.");
  }
  if (rawItems.length > MAX_ITEMS) throw httpError(400, `Maksimal ${MAX_ITEMS} layanan per transaksi.`);

  const items = rawItems.map((raw) => {
    const serviceName = cleanText(raw?.serviceName);
    const price = Number(raw?.price);
    const qty = Number(raw?.qty ?? 1);
    if (!serviceName || serviceName.length > 150) throw httpError(400, "Nama layanan tidak valid.");
    if (!isMoney(price)) throw httpError(400, `Harga "${serviceName}" tidak valid.`);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw httpError(400, `Jumlah "${serviceName}" harus 1 - 20.`);
    return { serviceName, price, qty, subtotal: price * qty };
  });
  return { items, subtotal: items.reduce((sum, i) => sum + i.subtotal, 0) };
}

// Nomor nota berurutan per hari: INV-YYYYMMDD-0001. Dikunci per tanggal
// supaya dua kasir yang menyimpan bersamaan tidak dapat nomor yang sama.
async function nextInvoiceNo(client) {
  const today = todayWIB();
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`rosita_invoice_${today}`]);
  const prefix = `INV-${today.replaceAll("-", "")}-`;
  const { rows } = await client.query(
    "SELECT COUNT(*) AS n FROM payments WHERE invoice_no LIKE $1",
    [`${prefix}%`]
  );
  return `${prefix}${String(rows[0].n + 1).padStart(4, "0")}`;
}

async function getPayment(conn, id) {
  const { rows } = await conn.query(
    `SELECT p.*, c.name AS cashier_name, u.email AS user_email,
            r.reservation_date, to_char(r.reservation_time, 'HH24:MI') AS reservation_time
     FROM payments p
     LEFT JOIN users c ON c.id = p.cashier_id
     LEFT JOIN users u ON u.id = p.user_id
     LEFT JOIN reservations r ON r.id = p.reservation_id
     WHERE p.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const { rows: items } = await conn.query(
    "SELECT service_name, price, qty, subtotal FROM payment_items WHERE payment_id = $1 ORDER BY id",
    [id]
  );
  return { ...rows[0], items };
}

// Rentang tanggal laporan/riwayat (WIB). Default: hari ini.
function parseRange(query) {
  const today = todayWIB();
  const from = isValidDateString(query.from) ? query.from : today;
  const to = isValidDateString(query.to) ? query.to : from;
  if (to < from) throw httpError(400, "Tanggal akhir harus setelah tanggal awal.");
  return { from, to };
}

// Kondisi SQL "paid_at di tanggal from..to (WIB)"
const IN_RANGE_SQL = "(p.paid_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1 AND $2";

router.use(requireAuth);

// -------------------------------------------------
// GET /api/payments/mine   (customer)
// Riwayat pembayaran milik akun yang login, termasuk transaksi walk-in
// yang dikaitkan admin ke akunnya.
// -------------------------------------------------
router.get("/mine", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.invoice_no, p.source, p.total, p.method, p.status, p.paid_at,
              COALESCE(string_agg(i.service_name, ', ' ORDER BY i.id), '') AS services
       FROM payments p
       LEFT JOIN payment_items i ON i.payment_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.paid_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json({ payments: rows });
  } catch (err) {
    sendError(res, err, "Gagal mengambil riwayat pembayaran.");
  }
});

// -------------------------------------------------
// GET /api/payments/customers?q=   (admin)
// Cari akun customer untuk dikaitkan ke transaksi walk-in
// -------------------------------------------------
router.get("/customers", requireRole("admin"), async (req, res) => {
  const q = cleanText(req.query.q).toLowerCase();
  if (q.length < 2) return res.json({ customers: [] });
  try {
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    const { rows } = await pool.query(
      `SELECT id, name, email, phone FROM users
       WHERE role = 'customer' AND (LOWER(name) LIKE $1 OR email LIKE $1 OR phone LIKE $1)
       ORDER BY name LIMIT 8`,
      [like]
    );
    res.json({ customers: rows });
  } catch (err) {
    sendError(res, err, "Gagal mencari customer.");
  }
});

// -------------------------------------------------
// GET /api/payments/report?from=YYYY-MM-DD&to=YYYY-MM-DD   (admin)
// Ringkasan penjualan: omzet, per metode, per sumber, per hari, layanan terlaris
// -------------------------------------------------
router.get("/report", requireRole("admin"), async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);
    const params = [from, to];
    const paid = `${IN_RANGE_SQL} AND p.status = 'paid'`;

    const [summary, byMethod, bySource, byDay, topServices] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS transactions, COALESCE(SUM(p.total), 0)::int AS revenue,
                COALESCE(SUM(p.discount), 0)::int AS discount,
                (SELECT COUNT(*) FROM payments p WHERE ${IN_RANGE_SQL} AND p.status = 'void') AS voided
         FROM payments p WHERE ${paid}`,
        params
      ),
      pool.query(
        `SELECT p.method, COUNT(*) AS transactions, SUM(p.total)::int AS revenue
         FROM payments p WHERE ${paid} GROUP BY p.method`,
        params
      ),
      pool.query(
        `SELECT p.source, COUNT(*) AS transactions, SUM(p.total)::int AS revenue
         FROM payments p WHERE ${paid} GROUP BY p.source`,
        params
      ),
      pool.query(
        `SELECT to_char((p.paid_at AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS date,
                COUNT(*) AS transactions, SUM(p.total)::int AS revenue
         FROM payments p WHERE ${paid} GROUP BY 1 ORDER BY 1`,
        params
      ),
      pool.query(
        `SELECT i.service_name, SUM(i.qty)::int AS qty, SUM(i.subtotal)::int AS revenue
         FROM payment_items i JOIN payments p ON p.id = i.payment_id
         WHERE ${paid} GROUP BY i.service_name ORDER BY qty DESC, revenue DESC LIMIT 10`,
        params
      ),
    ]);

    res.json({
      from,
      to,
      summary: summary.rows[0],
      byMethod: byMethod.rows,
      bySource: bySource.rows,
      byDay: byDay.rows,
      topServices: topServices.rows,
    });
  } catch (err) {
    sendError(res, err, "Gagal membuat laporan penjualan.");
  }
});

// -------------------------------------------------
// GET /api/payments?from=&to=   (admin)
// Riwayat transaksi pada rentang tanggal (default hari ini)
// -------------------------------------------------
router.get("/", requireRole("admin"), async (req, res) => {
  try {
    const { from, to } = parseRange(req.query);
    const { rows } = await pool.query(
      `SELECT p.id, p.invoice_no, p.source, p.customer_name, p.whatsapp, p.subtotal, p.discount,
              p.total, p.method, p.status, p.void_reason, p.paid_at, p.reservation_id, p.user_id,
              c.name AS cashier_name,
              COALESCE(string_agg(i.service_name, ', ' ORDER BY i.id), '') AS services
       FROM payments p
       LEFT JOIN users c ON c.id = p.cashier_id
       LEFT JOIN payment_items i ON i.payment_id = p.id
       WHERE ${IN_RANGE_SQL}
       GROUP BY p.id, c.name
       ORDER BY p.paid_at DESC`,
      [from, to]
    );
    res.json({ from, to, payments: rows });
  } catch (err) {
    sendError(res, err, "Gagal mengambil riwayat transaksi.");
  }
});

// -------------------------------------------------
// GET /api/payments/:id
// Detail transaksi + rincian layanan (untuk struk).
// Admin bisa lihat semua; customer hanya miliknya sendiri.
// -------------------------------------------------
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "ID transaksi tidak valid." });
  try {
    const payment = await getPayment(pool, id);
    if (!payment || (req.user.role !== "admin" && payment.user_id !== req.user.id)) {
      return res.status(404).json({ error: "Transaksi tidak ditemukan." });
    }
    res.json({ payment });
  } catch (err) {
    sendError(res, err, "Gagal mengambil detail transaksi.");
  }
});

// -------------------------------------------------
// POST /api/payments   (admin)
// body: {
//   reservationId?   -> bayar reservasi online (kosong = walk-in)
//   userId?          -> walk-in: kaitkan ke akun customer
//   customerName, whatsapp  -> walk-in tanpa akun
//   items: [{ serviceName, price, qty }], discount, method: "cash" | "qris",
//   cashReceived?, notes?, force?  (force = tetap simpan walk-in walau slot penuh)
// }
// -------------------------------------------------
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const method = req.body.method;
    if (!METHODS.includes(method)) throw httpError(400, "Pilih metode pembayaran: Cash atau QRIS.");

    const { items, subtotal } = parseItems(req.body.items);
    const discount = Number(req.body.discount || 0);
    if (!isMoney(discount) || discount > subtotal) {
      throw httpError(400, "Diskon tidak boleh lebih besar dari subtotal.");
    }
    const total = subtotal - discount;

    let cashReceived = null;
    let change = null;
    if (method === "cash") {
      cashReceived = Number(req.body.cashReceived);
      if (!isMoney(cashReceived, MAX_PRICE * 2) || cashReceived < total) {
        throw httpError(400, "Uang yang diterima kurang dari total pembayaran.");
      }
      change = cashReceived - total;
    }

    const notes = cleanText(req.body.notes);
    if (notes.length > 300) throw httpError(400, "Catatan maksimal 300 karakter.");
    const reservationId = req.body.reservationId ? parseId(req.body.reservationId) : null;
    if (req.body.reservationId && !reservationId) throw httpError(400, "ID reservasi tidak valid.");

    const paymentId = await withTransaction(async (client) => {
      let source;
      let resId;
      let userId = null;
      let customerName;
      let whatsapp;

      if (reservationId) {
        // ---- Pembayaran dari reservasi online ----
        source = "booking";
        // FOR UPDATE: kunci baris reservasi supaya tidak bisa dibayar dua kali bersamaan
        const { rows } = await client.query(
          `SELECT r.*, u.role AS owner_role FROM reservations r
           JOIN users u ON u.id = r.user_id WHERE r.id = $1 FOR UPDATE OF r`,
          [reservationId]
        );
        const r = rows[0];
        if (!r) throw httpError(404, "Reservasi tidak ditemukan.");
        if (!["pending", "confirmed"].includes(r.status)) {
          throw httpError(409, "Reservasi ini sudah dibayar atau dibatalkan.");
        }
        if (r.reservation_date > todayWIB()) {
          throw httpError(400, "Reservasi yang belum tiba tanggalnya belum bisa dibayar.");
        }
        resId = r.id;
        customerName = r.customer_name;
        whatsapp = r.whatsapp;
        userId = r.owner_role === "customer" ? r.user_id : null;
        await client.query("UPDATE reservations SET status = 'done' WHERE id = $1", [r.id]);
      } else {
        // ---- Walk-in: pelanggan datang langsung ----
        source = "walkin";
        if (req.body.userId) {
          const { rows } = await client.query(
            "SELECT id, name, phone FROM users WHERE id = $1 AND role = 'customer'",
            [parseId(req.body.userId)]
          );
          if (!rows[0]) throw httpError(404, "Akun customer tidak ditemukan.");
          userId = rows[0].id;
          customerName = rows[0].name;
          whatsapp = normalizePhone(req.body.whatsapp) || rows[0].phone || null;
        } else {
          customerName = cleanText(req.body.customerName);
          if (customerName.length < 2 || customerName.length > 100) {
            throw httpError(400, "Nama pelanggan harus 2 - 100 karakter.");
          }
          whatsapp = req.body.whatsapp ? normalizePhone(req.body.whatsapp) : null;
          if (req.body.whatsapp && !whatsapp) {
            throw httpError(400, "Nomor WhatsApp tidak valid. Contoh: 081234567890");
          }
        }

        // Catat juga sebagai reservasi "Selesai" di slot jam sekarang, supaya
        // kapasitas terapis terhitung dan booking online tidak bentrok.
        const slot = currentSlotWIB();
        if (slot) {
          const date = todayWIB();
          await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`rosita_slot_${date}_${slot}`]);
          const { rows: used } = await client.query(
            `SELECT COUNT(*) AS n FROM reservations
             WHERE reservation_date = $1 AND reservation_time = $2 AND status IN ('pending', 'confirmed', 'done')`,
            [date, `${slot}:00`]
          );
          if (used[0].n >= SLOT_CAPACITY && !req.body.force) {
            throw httpError(
              409,
              `Slot jam ${slot} sudah terisi ${used[0].n} dari ${SLOT_CAPACITY} terapis. Tetap simpan transaksi ini?`,
              { code: "SLOT_FULL" }
            );
          }
          const { rows: created } = await client.query(
            `INSERT INTO reservations
               (user_id, customer_name, whatsapp, service_name, reservation_date, reservation_time, end_time, notes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'done') RETURNING id`,
            [
              userId || req.user.id,
              customerName,
              whatsapp || "-",
              items.map((i) => i.serviceName).join(", ").slice(0, 150),
              date,
              `${slot}:00`,
              `${addMinutes(slot, SLOT_DURATION_MINUTES)}:00`,
              "Walk-in (dicatat dari kasir)",
            ]
          );
          resId = created[0].id;
        }
      }

      const invoiceNo = await nextInvoiceNo(client);
      const { rows: inserted } = await client.query(
        `INSERT INTO payments
           (invoice_no, reservation_id, user_id, cashier_id, source, customer_name, whatsapp,
            subtotal, discount, total, method, cash_received, change_amount, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        [
          invoiceNo, resId || null, userId, req.user.id, source, customerName, whatsapp,
          subtotal, discount, total, method, cashReceived, change, notes || null,
        ]
      );
      const id = inserted[0].id;
      for (const item of items) {
        await client.query(
          "INSERT INTO payment_items (payment_id, service_name, price, qty, subtotal) VALUES ($1, $2, $3, $4, $5)",
          [id, item.serviceName, item.price, item.qty, item.subtotal]
        );
      }
      return id;
    });

    res.status(201).json({ payment: await getPayment(pool, paymentId) });
  } catch (err) {
    // 23505: reservasi ini barusan dibayar dari kasir lain
    if (err.code === "23505") {
      return res.status(409).json({ error: "Reservasi ini sudah dibayar." });
    }
    sendError(res, err, "Gagal menyimpan pembayaran. Coba lagi.");
  }
});

// -------------------------------------------------
// PATCH /api/payments/:id/void   (admin)
// Batalkan transaksi (salah input / batal bayar). Data tidak dihapus supaya
// jejaknya tetap ada; reservasinya dikembalikan ke status sebelumnya.
// -------------------------------------------------
router.patch("/:id/void", requireRole("admin"), async (req, res) => {
  const id = parseId(req.params.id);
  const reason = cleanText(req.body.reason);
  if (!id) return res.status(400).json({ error: "ID transaksi tidak valid." });
  if (reason.length < 3 || reason.length > 200) {
    return res.status(400).json({ error: "Tulis alasan pembatalan (3 - 200 karakter)." });
  }

  try {
    await withTransaction(async (client) => {
      const { rows } = await client.query("SELECT * FROM payments WHERE id = $1 FOR UPDATE", [id]);
      const p = rows[0];
      if (!p) throw httpError(404, "Transaksi tidak ditemukan.");
      if (p.status === "void") throw httpError(409, "Transaksi ini sudah dibatalkan.");

      await client.query(
        "UPDATE payments SET status = 'void', void_reason = $1, voided_at = now() WHERE id = $2",
        [reason, id]
      );
      if (p.reservation_id) {
        // Booking online kembali "Terkonfirmasi" (bisa dibayar ulang);
        // reservasi otomatis dari walk-in ikut dibatalkan.
        await client.query("UPDATE reservations SET status = $1 WHERE id = $2 AND status = 'done'", [
          p.source === "booking" ? "confirmed" : "cancelled",
          p.reservation_id,
        ]);
      }
    });
    res.json({ payment: await getPayment(pool, id) });
  } catch (err) {
    sendError(res, err, "Gagal membatalkan transaksi.");
  }
});

export default router;
