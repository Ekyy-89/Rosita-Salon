// =====================================================================
// server/src/utils/seedAdmin.js
// Jalankan dengan: npm run seed:admin
// Membuat (atau update password) akun admin sesuai ADMIN_EMAIL di .env
// =====================================================================
import dotenv from "dotenv";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

dotenv.config();

const WEAK_PASSWORDS = ["admin", "admin123", "password", "12345678", "rosita123"];

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || "Admin Rosita Salon";
  const email = (process.env.ADMIN_EMAIL || "admin@rositasalon.com").toLowerCase();
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;

  // Tolak password admin yang lemah / default; kalau kosong, buatkan yang acak
  if (!password) {
    password = crypto.randomBytes(9).toString("base64url");
    generated = true;
  } else if (password.length < 10 || WEAK_PASSWORDS.includes(password.toLowerCase())) {
    console.error(
      "❌ ADMIN_PASSWORD terlalu lemah. Pakai minimal 10 karakter dan jangan password umum " +
        "seperti 'admin123'. Atau kosongkan saja supaya dibuatkan password acak."
    );
    await pool.end();
    process.exit(1);
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing.length > 0) {
      await pool.query(
        "UPDATE users SET name = $1, password = $2, role = 'admin' WHERE email = $3",
        [name, hashed, email]
      );
      console.log(`✅ Akun admin '${email}' sudah ada, password di-update.`);
    } else {
      await pool.query(
        "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin')",
        [name, email, hashed]
      );
      console.log(`✅ Akun admin '${email}' berhasil dibuat.`);
    }

    console.log(`   Email    : ${email}`);
    if (generated) {
      console.log(`   Password : ${password}`);
      console.log("   (password acak ini HANYA ditampilkan sekali — simpan baik-baik)");
    } else {
      console.log("   Password : (sesuai ADMIN_PASSWORD di .env)");
    }
    console.log("   (silakan login lewat halaman website menggunakan akun ini)");
  } catch (err) {
    console.error("❌ Gagal membuat akun admin:", err.message);
    console.error(
      "   Pastikan DATABASE_URL di server/.env benar dan tabel sudah dibuat (jalankan server/sql/schema.sql di Supabase SQL Editor)."
    );
  } finally {
    await pool.end();
  }
}

seedAdmin();
