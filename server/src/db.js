// =====================================================================
// server/src/db.js
// Koneksi pool ke MySQL (dipakai Laragon secara default)
// =====================================================================
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rosita_salon",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // kembalikan DATE/TIME sebagai string, bukan objek Date bermasalah timezone
});

export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log("✅ Koneksi database MySQL berhasil.");
  } catch (err) {
    console.error("❌ Gagal konek ke database MySQL:", err.message);
    console.error(
      "   Pastikan MySQL di Laragon sudah nyala, dan database 'rosita_salon' sudah dibuat (jalankan server/sql/schema.sql)."
    );
  }
}
