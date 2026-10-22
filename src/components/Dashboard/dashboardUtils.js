// =====================================================================
// src/components/Dashboard/dashboardUtils.js
// Helper bersama untuk dashboard admin & customer
// =====================================================================
import { SALON_INFO, toWhatsAppNumber } from "../../data/salonData";

export const STATUS_LABEL = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Terkonfirmasi",
  cancelled: "Dibatalkan",
  done: "Selesai",
};

export const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-gold/10 text-gold-dark border-gold/30",
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

// Warna titik kecil untuk tampilan jadwal
export const STATUS_DOT = {
  pending: "bg-amber-400",
  confirmed: "bg-gold",
  done: "bg-emerald-500",
  cancelled: "bg-red-400",
};

export const ACTIVE_STATUSES = ["pending", "confirmed"];

export function todayWIB() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

export function nowTimeWIB() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
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

export function formatDate(dateStr, options = { weekday: "short", day: "numeric", month: "long", year: "numeric" }) {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", ...options }).format(
      new Date(`${dateStr}T00:00:00Z`)
    );
  } catch {
    return dateStr;
  }
}

export const timeOf = (r) => r.reservation_time?.slice(0, 5) || "";

// Reservasi aktif yang sesinya sudah berakhir tapi belum ditandai selesai/batal
export function isOverdue(r, today = todayWIB(), now = nowTimeWIB()) {
  if (!ACTIVE_STATUSES.includes(r.status)) return false;
  const endTime = r.end_time?.slice(0, 5) || timeOf(r);
  return r.reservation_date < today || (r.reservation_date === today && endTime <= now);
}

export function sortBySchedule(list, direction = "asc") {
  const sign = direction === "asc" ? 1 : -1;
  return [...list].sort(
    (a, b) => sign * `${a.reservation_date} ${timeOf(a)}`.localeCompare(`${b.reservation_date} ${timeOf(b)}`)
  );
}

// Link WhatsApp ke customer dengan template pesan sesuai status reservasi
export function customerWhatsAppUrl(r) {
  const when = `${formatDate(r.reservation_date, { weekday: "long", day: "numeric", month: "long" })} jam ${timeOf(r)} WIB`;
  const templates = {
    pending: `Halo Kak ${r.customer_name}, kami dari ${SALON_INFO.name} ingin mengonfirmasi reservasi *${r.service_name}* pada ${when}. Apakah jadi datang? 🙏`,
    confirmed: `Halo Kak ${r.customer_name}, reservasi *${r.service_name}* kamu pada ${when} sudah *TERKONFIRMASI* ✅. Sampai jumpa di ${SALON_INFO.name}! ✨`,
    cancelled: `Halo Kak ${r.customer_name}, mohon maaf reservasi *${r.service_name}* pada ${when} kami batalkan. Silakan balas pesan ini untuk memilih jadwal lain ya 🙏`,
    done: `Terima kasih Kak ${r.customer_name} sudah datang ke ${SALON_INFO.name}! 💇‍♀️ Kalau berkenan, tulis testimoni di website kami ya ✨`,
  };
  const text = templates[r.status] || `Halo Kak ${r.customer_name}`;
  return `https://wa.me/${toWhatsAppNumber(r.whatsapp)}?text=${encodeURIComponent(text)}`;
}
