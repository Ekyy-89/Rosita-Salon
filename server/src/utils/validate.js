// =====================================================================
// server/src/utils/validate.js
// Helper validasi input. Jangan percaya data dari frontend — semua
// batasan (panjang teks, format nomor, dll) dicek ulang di server.
// =====================================================================

// Trim string; kembalikan "" kalau bukan string
export function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 150;
}

// Normalisasi nomor WA Indonesia: buang spasi/strip, "+62"/"62" -> "0".
// Return null kalau formatnya tidak masuk akal.
export function normalizePhone(value) {
  let digits = cleanText(value).replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  if (!digits.startsWith("08") || digits.length < 10 || digits.length > 14) return null;
  return digits;
}
