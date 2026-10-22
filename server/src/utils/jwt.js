// =====================================================================
// server/src/utils/jwt.js
// =====================================================================
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// JANGAN pakai secret bawaan yang tertulis di kode: siapa pun yang baca kode
// bisa memalsukan token admin. Kalau JWT_SECRET belum diisi, pakai secret acak
// per proses (token lama otomatis tidak berlaku setiap server restart).
let SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET.length < 32 || SECRET.startsWith("ganti_dengan")) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET wajib diisi (minimal 32 karakter acak) di server/.env");
  }
  console.warn(
    "⚠️  JWT_SECRET belum diisi / terlalu pendek. Memakai secret acak sementara — " +
      "semua user harus login ulang setiap server restart."
  );
  SECRET = crypto.randomBytes(48).toString("hex");
}

const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN, algorithm: "HS256" });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ["HS256"] });
}
