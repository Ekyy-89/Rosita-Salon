// =====================================================================
// src/components/BookingModal.jsx
// Reservasi WAJIB login (ditegakkan dari App.jsx sebelum modal ini dibuka).
// Alur: pilih layanan -> pilih tanggal -> pilih slot jam yang masih kosong
// (diambil real-time dari backend) -> isi data diri -> simpan.
// Setelah tersimpan, user bisa kirim ringkasan ke WhatsApp salon.
// =====================================================================
import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  User,
  Phone,
  Calendar,
  Clock,
  Scissors,
  MessageSquare,
  CheckCircle2,
  MessageCircle,
  ListChecks,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { SALON_INFO, BOOKING_GROUPS, findBookingOption } from "../data/salonData";
import { reservationApi } from "../api/client";
import { customerWhatsAppUrl } from "./Dashboard/dashboardUtils";
import { useAuth } from "../context/AuthContext";

const DAYS_SHOWN = 14;
const MAX_DAYS_AHEAD = 60;
const NOTES_MAX = 500;

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 24, stiffness: 260 },
  },
  exit: { opacity: 0, y: 40, scale: 0.97, transition: { duration: 0.2 } },
};

// ---------- helper tanggal (zona WIB, sama dengan backend) ----------
function todayWIB() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function formatDate(dateStr, options) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", ...options }).format(
    new Date(`${dateStr}T00:00:00Z`)
  );
}
function formatLongDate(dateStr) {
  return formatDate(dateStr, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function endTime(time) {
  const [h, m] = time.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function isValidPhone(value) {
  let digits = value.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  return /^08\d{8,12}$/.test(digits);
}

const emptyForm = {
  customerName: "",
  whatsapp: "",
  serviceName: "",
  date: "",
  time: "",
  notes: "",
};

/**
 * Props:
 * - isOpen, onClose
 * - prefill: { serviceName?, date?, time? } — dari tombol layanan/promo atau AI assistant
 * - onViewReservations: buka halaman "Reservasi Saya" / dashboard
 * - onCreated(reservation): dipanggil setelah reservasi berhasil disimpan
 *
 * Kalau yang login admin, form dipakai untuk mencatat reservasi pelanggan
 * yang datang langsung / booking lewat telepon (walk-in).
 */
export default function BookingModal({ isOpen, onClose, prefill, onViewReservations, onCreated }) {
  const { user, isAdmin } = useAuth();

  const [form, setForm] = useState(emptyForm);
  const [confirmNow, setConfirmNow] = useState(true); // khusus admin
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [reservation, setReservation] = useState(null); // hasil sukses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const latestDateRef = useRef("");

  const today = todayWIB();
  const dateChips = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i));

  // Isi awal form setiap kali modal dibuka
  useEffect(() => {
    if (!isOpen) return;
    setForm((prev) => ({
      ...emptyForm,
      // Admin mengisi data pelanggan, bukan data dirinya sendiri
      customerName: isAdmin ? "" : user?.name || prev.customerName,
      whatsapp: isAdmin ? "" : user?.phone || prev.whatsapp,
      serviceName: prefill?.serviceName || "",
      date: prefill?.date || todayWIB(),
      time: prefill?.time || "",
    }));
    setReservation(null);
    setError("");
  }, [isOpen, prefill, user, isAdmin]);

  const loadSlots = useCallback(async (date) => {
    if (!date) return;
    latestDateRef.current = date;
    setSlotsLoading(true);
    setSlotsError("");
    try {
      const { slots } = await reservationApi.availability(date);
      // Abaikan respon lama kalau user sudah keburu pindah tanggal
      if (latestDateRef.current !== date) return;
      setSlots(slots);
      // Kalau jam yang sudah dipilih ternyata tidak tersedia di tanggal ini, kosongkan
      setForm((prev) =>
        prev.date === date && prev.time && !slots.some((s) => s.time === prev.time && s.available)
          ? { ...prev, time: "" }
          : prev
      );
    } catch (err) {
      if (latestDateRef.current !== date) return;
      setSlots([]);
      setSlotsError(err.message);
    } finally {
      if (latestDateRef.current === date) setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && form.date) loadSlots(form.date);
  }, [isOpen, form.date, loadSlots]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const pickDate = (date) => setForm((prev) => ({ ...prev, date, time: prev.date === date ? prev.time : "" }));
  const pickTime = (time) => setForm((prev) => ({ ...prev, time }));

  const selectedOption = findBookingOption(form.serviceName);
  const availableCount = slots.filter((s) => s.available).length;

  const buildWhatsAppUrl = (r) => {
    const lines = [
      "Halo Rosita Salon, saya baru saja membuat reservasi lewat website 💇‍♀️✨",
      "",
      `Nama: ${r.customer_name}`,
      `No. WA: ${r.whatsapp}`,
      `Layanan: ${r.service_name}`,
      `Tanggal: ${formatLongDate(r.reservation_date)}`,
      `Jam: ${r.reservation_time.slice(0, 5)} WIB`,
      `Catatan: ${r.notes || "-"}`,
      "",
      "Mohon konfirmasinya ya, terima kasih! 🙏",
    ];
    return `https://wa.me/${SALON_INFO.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.serviceName) return setError("Pilih layanan dulu ya.");
    if (!form.date) return setError("Pilih tanggal dulu ya.");
    if (!form.time) return setError("Pilih jam yang masih tersedia ya.");
    if (form.customerName.trim().length < 2) return setError("Nama minimal 2 karakter.");
    if (!isValidPhone(form.whatsapp))
      return setError("Nomor WhatsApp tidak valid. Contoh: 081234567890");

    setIsSubmitting(true);
    try {
      const payload = isAdmin && confirmNow ? { ...form, status: "confirmed" } : form;
      const { reservation } = await reservationApi.create(payload);
      setReservation(reservation);
      onCreated?.(reservation);
    } catch (err) {
      setError(err.message);
      // Slot keburu diambil orang lain -> muat ulang jadwal
      if (err.status === 409) loadSlots(form.date);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
        >
          <motion.div className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" onClick={handleClose} />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            variants={modalVariants}
            className="relative w-full sm:max-w-xl max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gold/15"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-charcoal/5">
              <div>
                <h3 id="booking-title" className="font-serif text-xl font-semibold text-charcoal">
                  {reservation ? "Reservasi Tersimpan" : isAdmin ? "Tambah Reservasi" : "Book Appointment"}
                </h3>
                <p className="text-xs text-charcoal/50 mt-0.5">
                  {reservation
                    ? isAdmin
                      ? "Sudah masuk ke jadwal salon"
                      : "Tinggal tunggu konfirmasi dari admin"
                    : isAdmin
                      ? "Catat pelanggan yang datang langsung / booking lewat telepon"
                      : "Pilih layanan, tanggal, dan jam yang masih kosong"}
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Tutup"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gold/10 text-charcoal/60 hover:text-gold-dark transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {reservation ? (
                <SuccessView
                  key="success"
                  reservation={reservation}
                  price={findBookingOption(reservation.service_name)?.price}
                  whatsappUrl={isAdmin ? customerWhatsAppUrl(reservation) : buildWhatsAppUrl(reservation)}
                  isAdmin={isAdmin}
                  onViewReservations={onViewReservations}
                  onClose={handleClose}
                />
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  noValidate
                  className="flex-1 flex flex-col min-h-0"
                >
                  <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6">
                    {/* 1. Layanan */}
                    <Step number={1} icon={Scissors} title="Pilih Layanan">
                      <select
                        name="serviceName"
                        value={form.serviceName}
                        onChange={handleChange}
                        className={inputClass}
                      >
                        <option value="" disabled>
                          Pilih layanan...
                        </option>
                        {/* Layanan dari AI yang tidak ada di daftar tetap bisa tampil */}
                        {form.serviceName && !selectedOption && (
                          <option value={form.serviceName}>{form.serviceName}</option>
                        )}
                        {BOOKING_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((o) => (
                              <option key={o.name} value={o.name}>
                                {o.name} — {o.price}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </Step>

                    {/* 2. Tanggal */}
                    <Step number={2} icon={Calendar} title="Pilih Tanggal">
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
                        {dateChips.map((date, i) => {
                          const active = form.date === date;
                          return (
                            <button
                              key={date}
                              type="button"
                              onClick={() => pickDate(date)}
                              aria-pressed={active}
                              className={`shrink-0 w-[68px] py-2.5 rounded-xl border text-center transition-all ${
                                active
                                  ? "bg-gold-gradient text-white border-transparent shadow-gold"
                                  : "bg-offwhite border-charcoal/10 text-charcoal/70 hover:border-gold/40"
                              }`}
                            >
                              <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-80">
                                {i === 0 ? "Hari ini" : i === 1 ? "Besok" : formatDate(date, { weekday: "short" })}
                              </span>
                              <span className="block text-lg font-semibold leading-tight">
                                {formatDate(date, { day: "numeric" })}
                              </span>
                              <span className="block text-[10px] opacity-80">
                                {formatDate(date, { month: "short" })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-xs text-charcoal/50">
                        Tanggal lain:
                        <input
                          type="date"
                          min={today}
                          max={addDays(today, MAX_DAYS_AHEAD)}
                          value={form.date}
                          onChange={(e) => e.target.value && pickDate(e.target.value)}
                          className="rounded-lg border border-charcoal/10 bg-offwhite px-2 py-1 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                      </label>
                    </Step>

                    {/* 3. Jam */}
                    <Step
                      number={3}
                      icon={Clock}
                      title="Pilih Jam"
                      aside={
                        form.date && (
                          <span className="text-[11px] text-charcoal/45">
                            {formatDate(form.date, { weekday: "long", day: "numeric", month: "long" })}
                          </span>
                        )
                      }
                    >
                      {slotsLoading ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-11 rounded-xl bg-charcoal/5 animate-pulse" />
                          ))}
                        </div>
                      ) : slotsError ? (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                          <span>{slotsError}</span>
                          <button
                            type="button"
                            onClick={() => loadSlots(form.date)}
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          >
                            <RefreshCw size={12} /> Coba lagi
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {slots.map((slot) => {
                              const active = form.time === slot.time;
                              return (
                                <button
                                  key={slot.time}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => pickTime(slot.time)}
                                  aria-pressed={active}
                                  className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                                    active
                                      ? "bg-gold-gradient text-white border-transparent shadow-gold"
                                      : slot.available
                                        ? "bg-white border-charcoal/10 text-charcoal/75 hover:border-gold/50 hover:text-gold-dark"
                                        : "bg-charcoal/[0.03] border-transparent text-charcoal/25 line-through cursor-not-allowed"
                                  }`}
                                >
                                  {slot.time}
                                </button>
                              );
                            })}
                          </div>
                          {slots.length > 0 && availableCount === 0 ? (
                            <p className="mt-3 text-xs text-gold-dark bg-gold/10 rounded-lg px-3 py-2">
                              Semua jam di tanggal ini sudah penuh atau lewat. Coba pilih tanggal lain ya.
                            </p>
                          ) : (
                            <p className="mt-2 text-[11px] text-charcoal/40">
                              Durasi per slot ±1 jam. Jam yang dicoret sudah penuh / lewat.
                            </p>
                          )}
                        </>
                      )}
                    </Step>

                    {/* 4. Data diri */}
                    <Step number={4} icon={User} title={isAdmin ? "Data Pelanggan" : "Data Kamu"}>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field
                          icon={User}
                          label="Nama Lengkap"
                          name="customerName"
                          value={form.customerName}
                          onChange={handleChange}
                          placeholder={isAdmin ? "Nama pelanggan" : "Masukkan nama kamu"}
                          autoComplete={isAdmin ? "off" : "name"}
                          maxLength={100}
                        />
                        <Field
                          icon={Phone}
                          label="Nomor WhatsApp"
                          name="whatsapp"
                          type="tel"
                          inputMode="tel"
                          value={form.whatsapp}
                          onChange={handleChange}
                          placeholder="0812xxxxxxx"
                          autoComplete={isAdmin ? "off" : "tel"}
                          maxLength={20}
                        />
                      </div>
                      <label className="block mt-3">
                        <span className="flex items-center justify-between text-xs font-semibold text-charcoal/70 mb-1.5">
                          <span className="flex items-center gap-2">
                            <MessageSquare size={14} className="text-gold-dark" />
                            Catatan (opsional)
                          </span>
                          <span className="font-normal text-charcoal/35">
                            {form.notes.length}/{NOTES_MAX}
                          </span>
                        </span>
                        <textarea
                          name="notes"
                          value={form.notes}
                          onChange={handleChange}
                          rows={2}
                          maxLength={NOTES_MAX}
                          placeholder="Contoh: request terapis tertentu, alergi produk, dll."
                          className={`${inputClass} resize-none`}
                        />
                      </label>
                      {isAdmin && (
                        <label className="mt-3 flex items-center gap-2.5 text-sm text-charcoal/70 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={confirmNow}
                            onChange={(e) => setConfirmNow(e.target.checked)}
                            className="w-4 h-4 accent-[#C5A059]"
                          />
                          Langsung tandai <strong className="font-semibold">Terkonfirmasi</strong>
                        </label>
                      )}
                    </Step>
                  </div>

                  {/* Footer: ringkasan + tombol simpan, selalu terlihat */}
                  <div className="border-t border-charcoal/5 px-6 md:px-8 py-4 bg-white rounded-b-3xl space-y-3">
                    {error && (
                      <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                        {error}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 text-xs text-charcoal/60">
                      <span className="truncate">
                        {form.serviceName || "Belum pilih layanan"}
                        {form.date && form.time && (
                          <>
                            {" · "}
                            {formatDate(form.date, { day: "numeric", month: "short" })}, {form.time}
                          </>
                        )}
                      </span>
                      {selectedOption && (
                        <span className="shrink-0 font-semibold text-gold-dark">{selectedOption.price}</span>
                      )}
                    </div>
                    <motion.button
                      whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                      whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gold-gradient text-white font-semibold px-6 py-3.5 rounded-full shadow-gold hover:shadow-lg transition-all duration-300 disabled:opacity-60"
                    >
                      {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                      {isSubmitting ? "Menyimpan..." : isAdmin ? "Simpan ke Jadwal" : "Konfirmasi Reservasi"}
                    </motion.button>
                    <p className="text-[11px] text-center text-charcoal/40">
                      {isAdmin ? "Dicatat oleh admin" : "Login sebagai"} <strong>{user?.name}</strong> ({user?.email})
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const inputClass =
  "w-full rounded-xl border border-charcoal/10 bg-offwhite px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all";

function Step({ number, icon: Icon, title, aside, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-charcoal">
          <span className="w-5 h-5 rounded-full bg-gold/15 text-gold-dark text-[11px] flex items-center justify-center">
            {number}
          </span>
          <Icon size={14} className="text-gold-dark" />
          {title}
        </h4>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ icon: Icon, label, name, value, onChange, type = "text", ...rest }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-xs font-semibold text-charcoal/70 mb-1.5">
        <Icon size={14} className="text-gold-dark" />
        {label}
      </span>
      <input type={type} name={name} value={value} onChange={onChange} className={inputClass} {...rest} />
    </label>
  );
}

function SuccessView({ reservation: r, price, whatsappUrl, isAdmin, onViewReservations, onClose }) {
  const confirmed = r.status === "confirmed";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="overflow-y-auto px-6 md:px-8 py-8 flex flex-col items-center text-center [&>*]:shrink-0"
    >
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="shrink-0 w-16 h-16 rounded-full bg-gold-gradient flex items-center justify-center text-white mb-4 shadow-gold"
      >
        <CheckCircle2 size={28} />
      </motion.span>
      <h4 className="font-serif text-lg font-semibold text-charcoal">Reservasi Berhasil Dibuat!</h4>
      <p className="text-sm text-charcoal/55 mt-1.5 max-w-sm">
        Status:{" "}
        <strong className="text-charcoal/75">{confirmed ? "Terkonfirmasi" : "Menunggu Konfirmasi"}</strong>.{" "}
        {isAdmin
          ? "Kirim konfirmasi ke pelanggan lewat WhatsApp kalau perlu."
          : "Admin akan menghubungi kamu lewat WhatsApp."}
      </p>

      <dl className="mt-6 w-full text-left text-sm bg-offwhite rounded-2xl border border-charcoal/5 divide-y divide-charcoal/5">
        <SummaryRow label="Layanan" value={r.service_name} extra={price} />
        <SummaryRow label="Tanggal" value={formatLongDate(r.reservation_date)} />
        <SummaryRow
          label="Jam"
          value={`${r.reservation_time.slice(0, 5)} - ${endTime(r.reservation_time.slice(0, 5))} WIB`}
        />
        <SummaryRow label="Atas nama" value={`${r.customer_name} (${r.whatsapp})`} />
      </dl>

      <div className="mt-6 w-full grid gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold px-6 py-3 rounded-full hover:brightness-95 transition-all"
        >
          <MessageCircle size={17} />
          {isAdmin ? "Kirim Konfirmasi ke Pelanggan" : "Kirim Detail ke WhatsApp Salon"}
        </a>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onViewReservations}
            className="inline-flex items-center justify-center gap-1.5 border border-gold/40 text-gold-dark font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-gold/10 transition-colors"
          >
            <ListChecks size={15} />
            {isAdmin ? "Ke Dashboard" : "Reservasi Saya"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="border border-charcoal/10 text-charcoal/60 font-semibold text-sm px-4 py-2.5 rounded-full hover:bg-charcoal/5 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryRow({ label, value, extra }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <dt className="text-charcoal/45 shrink-0">{label}</dt>
      <dd className="text-right font-medium text-charcoal">
        {value}
        {extra && <span className="block text-xs text-gold-dark font-semibold">{extra}</span>}
      </dd>
    </div>
  );
}
