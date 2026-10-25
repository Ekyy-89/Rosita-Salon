// =====================================================================
// server/src/db.js
// Koneksi pool ke Postgres (Supabase). Alamat database diambil dari
// DATABASE_URL di server/.env (lokal) atau Environment Variables Vercel.
// =====================================================================
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, types } = pg;

// Kembalikan DATE sebagai string "YYYY-MM-DD" (bukan objek Date yang bisa
// bergeser tanggal karena timezone), dan COUNT(*) (bigint) sebagai number.
types.setTypeParser(1082, (value) => value);
types.setTypeParser(20, (value) => Number(value));

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL belum diisi. Lihat server/.env.example.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase wajib koneksi terenkripsi (SSL)
  ssl: { rejectUnauthorized: false },
  // Di Vercel tiap instance serverless cukup 1 koneksi; pooler Supabase yang membagi
  max: process.env.VERCEL ? 1 : 10,
  idleTimeoutMillis: 10000,
  // Koneksi pertama ke pooler Supabase kadang butuh beberapa detik (cold start)
  connectionTimeoutMillis: 15000,
});

// Jangan sampai koneksi idle yang putus membuat server crash
pool.on("error", (err) => console.error("Postgres pool error:", err.message));

// Jalankan fn(client) dalam satu transaksi (BEGIN ... COMMIT / ROLLBACK)
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function testConnection() {
  try {
    await pool.query("SELECT 1");
    console.log("✅ Koneksi database Postgres (Supabase) berhasil.");
  } catch (err) {
    console.error("❌ Gagal konek ke database:", err.message);
    console.error("   Cek DATABASE_URL di server/.env (connection string dari Supabase).");
  }
}
