// =====================================================================
// src/components/Dashboard/AdminReservations.jsx
// Daftar reservasi untuk admin: ringkasan angka, pencarian, filter,
// dan tombol aksi yang menyesuaikan status (konfirmasi, bayar di kasir,
// batal, ubah jadwal, chat WA dengan template pesan).
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Phone,
  Scissors,
  Search,
  CheckCircle2,
  XCircle,
  CalendarClock,
  MessageCircle,
  RotateCcw,
  AlertTriangle,
  Inbox,
  CalendarDays,
  BadgeCheck,
  Store,
  X,
  Wallet,
  Receipt,
} from "lucide-react";
import { reservationApi } from "../../api/client";
import ReceiptModal from "./ReceiptModal";
import {
  STATUS_LABEL,
  STATUS_STYLES,
  ACTIVE_STATUSES,
  todayWIB,
  nowTimeWIB,
  addDays,
  formatDate,
  timeOf,
  isOverdue,
  sortBySchedule,
  customerWhatsAppUrl,
  formatRupiah,
  METHOD_LABEL,
} from "./dashboardUtils";

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "today", label: "Hari Ini", test: (r, t) => r.reservation_date === t.today && r.status !== "cancelled", sort: "asc" },
  { key: "pending", label: "Perlu Konfirmasi", test: (r, t) => r.status === "pending" && !isOverdue(r, t.today, t.now), sort: "asc" },
  { key: "upcoming", label: "Akan Datang", test: (r, t) => ACTIVE_STATUSES.includes(r.status) && r.reservation_date >= t.today, sort: "asc" },
  { key: "overdue", label: "Belum Ditindaklanjuti", test: (r, t) => isOverdue(r, t.today, t.now), sort: "asc" },
  { key: "all", label: "Semua", test: () => true, sort: "desc" },
];

export default function AdminReservations({ reservations, onUpdated, onError, onPay }) {
  const [activeFilter, setActiveFilter] = useState("today");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const today = todayWIB();
  const now = nowTimeWIB();
  const ctx = { today, now };

  const stats = useMemo(() => {
    const week = addDays(today, 6);
    const month = today.slice(0, 7);
    return {
      today: reservations.filter((r) => r.reservation_date === today && r.status !== "cancelled").length,
      pending: reservations.filter((r) => r.status === "pending" && !isOverdue(r, today, now)).length,
      week: reservations.filter(
        (r) => ACTIVE_STATUSES.includes(r.status) && r.reservation_date >= today && r.reservation_date <= week
      ).length,
      doneMonth: reservations.filter((r) => r.status === "done" && r.reservation_date.startsWith(month)).length,
    };
  }, [reservations, today, now]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, reservations.filter((r) => f.test(r, ctx)).length])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, today, now]
  );

  const visible = useMemo(() => {
    const filter = FILTERS.find((f) => f.key === activeFilter);
    const q = query.trim().toLowerCase();
    const list = reservations.filter((r) => {
      if (!filter.test(r, ctx)) return false;
      if (!q) return true;
      return [r.customer_name, r.whatsapp, r.service_name, r.user_email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q));
    });
    return sortBySchedule(list, filter.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, activeFilter, query, today, now]);

  const selectFilter = (key) => {
    setActiveFilter(key);
    setLimit(PAGE_SIZE);
  };

  return (
    <div>
      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={CalendarDays} label="Reservasi hari ini" value={stats.today} onClick={() => selectFilter("today")} />
        <StatCard
          icon={Inbox}
          label="Perlu konfirmasi"
          value={stats.pending}
          highlight={stats.pending > 0}
          onClick={() => selectFilter("pending")}
        />
        <StatCard icon={Calendar} label="7 hari ke depan" value={stats.week} onClick={() => selectFilter("upcoming")} />
        <StatCard icon={BadgeCheck} label="Selesai bulan ini" value={stats.doneMonth} />
      </div>

      {counts.overdue > 0 && activeFilter !== "overdue" && (
        <button
          onClick={() => selectFilter("overdue")}
          className="w-full mb-5 flex items-center gap-3 text-left text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle size={17} className="shrink-0" />
          <span>
            Ada <strong>{counts.overdue} reservasi</strong> yang jadwalnya sudah lewat tapi belum dibayar di
            kasir / dibatalkan. <span className="underline">Lihat</span>
          </span>
        </button>
      )}

      {/* Pencarian + filter */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <label className="relative md:w-72 shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE_SIZE);
            }}
            placeholder="Cari nama, no. WA, layanan..."
            aria-label="Cari reservasi"
            className="w-full rounded-full border border-charcoal/10 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-visible -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.filter((f) => f.key !== "overdue" || counts.overdue > 0).map((f) => (
            <button
              key={f.key}
              onClick={() => selectFilter(f.key)}
              aria-pressed={activeFilter === f.key}
              className={`shrink-0 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-all ${
                activeFilter === f.key
                  ? "bg-charcoal text-white border-charcoal"
                  : "bg-white text-charcoal/60 border-charcoal/10 hover:border-gold/40"
              }`}
            >
              {f.label}
              <span className={`text-[11px] px-1.5 rounded-full ${activeFilter === f.key ? "bg-white/20" : "bg-charcoal/5"}`}>
                {counts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-charcoal/10">
          <Calendar size={30} className="mx-auto text-gold/60" />
          <p className="mt-3 text-charcoal/55 text-sm">
            {query ? `Tidak ada reservasi yang cocok dengan "${query}".` : "Tidak ada reservasi di kategori ini."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.slice(0, limit).map((r) => (
            <AdminReservationCard
              key={r.id}
              reservation={r}
              today={today}
              now={now}
              onUpdated={onUpdated}
              onError={onError}
              onPay={onPay}
            />
          ))}
          {visible.length > limit && (
            <button
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
              className="justify-self-center text-sm font-semibold text-gold-dark px-5 py-2.5 rounded-full border border-gold/30 hover:bg-gold/10"
            >
              Tampilkan lebih banyak ({visible.length - limit} lagi)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border p-4 shadow-soft transition-all ${
        highlight ? "border-amber-300 ring-2 ring-amber-100" : "border-charcoal/5"
      } ${onClick ? "hover:border-gold/40 hover:-translate-y-0.5" : ""}`}
    >
      <span className="flex items-center gap-2 text-xs text-charcoal/50">
        <Icon size={14} className="text-gold-dark" />
        {label}
      </span>
      <span className="block mt-1.5 font-serif text-2xl font-semibold text-charcoal">{value}</span>
    </Tag>
  );
}

function AdminReservationCard({ reservation: r, today, now, onUpdated, onError, onPay }) {
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const overdue = isOverdue(r, today, now);
  const isActive = ACTIVE_STATUSES.includes(r.status);
  // Reservasi diselesaikan lewat Kasir (bayar), mulai hari-H
  const canPay = isActive && !r.payment_id;
  const payOpen = r.reservation_date <= today;
  const isFutureSlot = r.reservation_date > today || (r.reservation_date === today && timeOf(r) > now);
  const isWalkIn = r.created_by_role === "admin";

  const changeStatus = async (status, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const { reservation } = await reservationApi.updateStatus(r.id, status);
      onUpdated(reservation);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border p-4 md:p-5 shadow-soft ${
        overdue ? "border-amber-200" : "border-charcoal/5"
      } ${r.status === "cancelled" ? "opacity-75" : ""}`}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Jadwal (kolom kiri, mudah dipindai) */}
        <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-0.5 md:w-36 shrink-0 md:border-r md:border-dashed md:border-charcoal/10 md:pr-4">
          <span className="font-serif text-2xl font-semibold text-charcoal leading-none">{timeOf(r)}</span>
          <span className="text-xs text-charcoal/50">
            {r.reservation_date === today
              ? "Hari ini"
              : r.reservation_date === addDays(today, 1)
                ? "Besok"
                : formatDate(r.reservation_date, { weekday: "short", day: "numeric", month: "short" })}
          </span>
          {overdue && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full md:mt-1.5">
              Sudah lewat
            </span>
          )}
        </div>

        {/* Detail */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-charcoal flex items-center gap-2 flex-wrap">
                {r.customer_name}
                {isWalkIn && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-charcoal/50 bg-charcoal/5 px-2 py-0.5 rounded-full">
                    <Store size={10} /> Dicatat admin
                  </span>
                )}
              </h3>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal/60">
                <span className="inline-flex items-center gap-1.5">
                  <Scissors size={13} className="text-gold-dark" />
                  {r.service_name}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={13} className="text-gold-dark" />
                  {r.whatsapp}
                </span>
                {!isWalkIn && <span className="text-xs text-charcoal/40 self-center">{r.user_email}</span>}
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_STYLES[r.status] || ""}`}>
                {STATUS_LABEL[r.status] || r.status}
              </span>
              {r.payment_id && (
                <span className="text-[11px] font-semibold text-emerald-700">
                  Lunas · {METHOD_LABEL[r.payment_method]} · {formatRupiah(r.payment_total)}
                </span>
              )}
            </div>
          </div>

          {r.notes && (
            <p className="mt-2.5 text-sm text-charcoal/60 bg-offwhite rounded-xl px-3.5 py-2 break-words">
              <span className="text-xs font-semibold text-charcoal/40 mr-1.5">Catatan:</span>
              {r.notes}
            </p>
          )}

          {/* Aksi sesuai status */}
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {r.status === "pending" && !overdue && (
              <ActionButton
                icon={CheckCircle2}
                label="Konfirmasi"
                variant="primary"
                disabled={busy}
                onClick={() => changeStatus("confirmed")}
              />
            )}
            {canPay && (
              <ActionButton
                icon={Wallet}
                label="Bayar"
                variant="success"
                disabled={busy || !payOpen}
                title={payOpen ? "Buka kasir untuk reservasi ini" : "Bisa dibayar mulai hari-H"}
                onClick={() => onPay(r.id)}
              />
            )}
            {r.payment_id && (
              <ActionButton icon={Receipt} label="Lihat Struk" onClick={() => setShowReceipt(true)} />
            )}
            {isActive && (
              <ActionButton
                icon={CalendarClock}
                label="Ubah Jadwal"
                disabled={busy}
                onClick={() => setRescheduling((v) => !v)}
              />
            )}
            {isActive && (
              <ActionButton
                icon={XCircle}
                label={overdue ? "Tidak Datang" : "Batalkan"}
                variant="danger"
                disabled={busy}
                onClick={() =>
                  changeStatus("cancelled", `Batalkan reservasi ${r.customer_name} (${r.service_name})?`)
                }
              />
            )}
            {r.status === "cancelled" && isFutureSlot && (
              <ActionButton
                icon={RotateCcw}
                label="Pulihkan"
                disabled={busy}
                onClick={() => changeStatus("pending")}
              />
            )}
            <a
              href={customerWhatsAppUrl(r)}
              target="_blank"
              rel="noopener noreferrer"
              title="Buka WhatsApp dengan pesan yang sudah disiapkan"
              className="md:ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors"
            >
              <MessageCircle size={13} />
              {r.status === "pending"
                ? "Tanya via WA"
                : r.status === "confirmed"
                  ? "Kirim Konfirmasi WA"
                  : r.status === "done"
                    ? "Minta Testimoni"
                    : "Kabari via WA"}
            </a>
          </div>

          {showReceipt && (
            <ReceiptModal paymentId={r.payment_id} onClose={() => setShowReceipt(false)} showWhatsApp />
          )}

          <AnimatePresence>
            {rescheduling && (
              <RescheduleForm
                reservation={r}
                onCancel={() => setRescheduling(false)}
                onDone={(updated) => {
                  setRescheduling(false);
                  onUpdated(updated);
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ icon: Icon, label, variant = "default", ...props }) {
  const styles = {
    primary: "bg-gold-gradient text-white border-transparent shadow-gold",
    success: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600",
    danger: "border-red-200 text-red-600 hover:bg-red-50",
    default: "border-charcoal/15 text-charcoal/70 hover:border-gold/40 hover:text-gold-dark",
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]}`}
      {...props}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

function RescheduleForm({ reservation: r, onCancel, onDone }) {
  const today = todayWIB();
  const [date, setDate] = useState(r.reservation_date >= today ? r.reservation_date : today);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSlots = async (d) => {
    setDate(d);
    setTime("");
    setError("");
    setLoading(true);
    try {
      const { slots } = await reservationApi.availability(d);
      setSlots(slots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Muat slot untuk tanggal awal sekali saat form dibuka
  useEffect(() => {
    loadSlots(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { reservation } = await reservationApi.reschedule(r.id, { date, time });
      onDone(reservation);
    } catch (err) {
      setError(err.message);
      if (err.status === 409) loadSlots(date);
    } finally {
      setSaving(false);
    }
  };

  const isCurrent = (t) => date === r.reservation_date && t === timeOf(r);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-3 p-4 rounded-xl bg-offwhite border border-gold/20">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-charcoal flex items-center gap-2">
            <CalendarClock size={15} className="text-gold-dark" />
            Pindahkan jadwal
          </p>
          <button onClick={onCancel} aria-label="Tutup" className="text-charcoal/40 hover:text-charcoal">
            <X size={16} />
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-charcoal/60 mb-3">
          Tanggal
          <input
            type="date"
            min={today}
            max={addDays(today, 60)}
            value={date}
            onChange={(e) => e.target.value && loadSlots(e.target.value)}
            className="rounded-lg border border-charcoal/10 bg-white px-2 py-1.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </label>
        {loading || !slots ? (
          <p className="text-xs text-charcoal/40 py-2">Memuat slot...</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {slots.map((s) => (
              <button
                key={s.time}
                type="button"
                disabled={!s.available || isCurrent(s.time)}
                onClick={() => setTime(s.time)}
                title={isCurrent(s.time) ? "Jadwal sekarang" : s.available ? `${s.remaining} slot tersisa` : "Penuh / lewat"}
                className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                  time === s.time
                    ? "bg-gold-gradient text-white border-transparent"
                    : isCurrent(s.time)
                      ? "border-gold/40 text-gold-dark bg-gold/10 cursor-default"
                      : s.available
                        ? "bg-white border-charcoal/10 text-charcoal/70 hover:border-gold/50"
                        : "border-transparent text-charcoal/25 line-through bg-charcoal/[0.03] cursor-not-allowed"
                }`}
              >
                {s.time}
              </button>
            ))}
          </div>
        )}
        {slots && !loading && !slots.some((s) => s.available && !isCurrent(s.time)) && (
          <p className="mt-2 text-xs text-gold-dark">
            Semua jam di tanggal ini sudah penuh / lewat. Pilih tanggal lain.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="text-xs font-semibold text-charcoal/50 px-3 py-1.5 hover:text-charcoal">
            Batal
          </button>
          <button
            onClick={save}
            disabled={!time || saving}
            className="text-xs font-semibold bg-charcoal text-white px-4 py-2 rounded-full disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : time ? `Pindah ke ${formatDate(date, { day: "numeric", month: "short" })}, ${time}` : "Pilih jam baru"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
