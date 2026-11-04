// =====================================================================
// server/src/utils/slots.js
// Sumber tunggal jadwal slot booking + helper tanggal zona WIB.
// Dipakai oleh form booking (lewat endpoint availability) dan AI assistant,
// supaya keduanya selalu membaca slot & ketersediaan yang sama.
// =====================================================================
import { pool } from "../db.js";

const TIMEZONE = "Asia/Jakarta";

// Jam mulai setiap slot (salon buka 09.00 - 20.00, slot terakhir mulai 19.00)
export const SLOT_TIMES = [
  "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];
export const SLOT_DURATION_MINUTES = 60;

// Berapa customer yang bisa dilayani bersamaan di satu slot (jumlah terapis)
export const SLOT_CAPACITY = Math.max(1, Number(process.env.SLOT_CAPACITY) || 1);

// Booking hanya bisa dibuat maksimal sekian hari ke depan
export const MAX_DAYS_AHEAD = 60;

// Status yang dianggap "memakai" slot. "done" ikut dihitung: customer walk-in
// yang sudah dibayar di kasir tetap memakai terapis di jam tersebut.
const OCCUPYING_STATUSES = ["pending", "confirmed", "done"];

// Slot yang sedang berjalan sekarang (mis. 14:23 -> "14:00"), null di luar jam buka
export function currentSlotWIB() {
  const slot = `${nowTimeWIB().slice(0, 2)}:00`;
  return SLOT_TIMES.includes(slot) ? slot : null;
}

// Tanggal hari ini di WIB, format YYYY-MM-DD
// (toISOString() pakai UTC, jadi jam 00.00 - 07.00 WIB tanggalnya masih kemarin)
export function todayWIB() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());
}

// Jam sekarang di WIB, format HH:MM
export function nowTimeWIB() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isValidDateString(dateStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

export function addMinutes(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Ketersediaan slot untuk rentang tanggal [startDate, startDate + days - 1]
// Hasil: { "YYYY-MM-DD": [{ time, remaining, available }] }
export async function getAvailabilityRange(startDate, days = 1, conn = pool) {
  const endDate = addDays(startDate, days - 1);
  const { rows } = await conn.query(
    `SELECT reservation_date, to_char(reservation_time, 'HH24:MI') AS time, COUNT(*) AS total
     FROM reservations
     WHERE reservation_date BETWEEN $1 AND $2 AND status = ANY($3)
     GROUP BY reservation_date, time`,
    [startDate, endDate, OCCUPYING_STATUSES]
  );

  const booked = new Map(rows.map((r) => [`${r.reservation_date} ${r.time}`, Number(r.total)]));
  const today = todayWIB();
  const now = nowTimeWIB();

  const result = {};
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    result[date] = SLOT_TIMES.map((time) => {
      const remaining = Math.max(0, SLOT_CAPACITY - (booked.get(`${date} ${time}`) || 0));
      const isPast = date < today || (date === today && time <= now);
      return { time, remaining, available: remaining > 0 && !isPast };
    });
  }
  return result;
}

export async function getAvailability(date, conn = pool) {
  const range = await getAvailabilityRange(date, 1, conn);
  return range[date];
}
