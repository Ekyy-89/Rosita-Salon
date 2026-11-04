// =====================================================================
// src/components/Dashboard/CustomerReservations.jsx
// Customer: lihat reservasi MILIK SENDIRI (bisa batalkan kalau masih pending)
// dan riwayat pembayaran + struk (termasuk transaksi walk-in di salon)
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Phone, User, XCircle, Plus, Info, Receipt, CheckCircle2 } from "lucide-react";
import { reservationApi, paymentApi } from "../../api/client";
import ReceiptModal from "./ReceiptModal";
import {
  STATUS_LABEL,
  STATUS_STYLES,
  ACTIVE_STATUSES,
  todayWIB,
  formatDate,
  timeOf,
  sortBySchedule,
  formatRupiah,
  formatDateTime,
  METHOD_LABEL,
  SOURCE_LABEL,
} from "./dashboardUtils";

const isUpcoming = (r, today) => r.reservation_date >= today && ACTIVE_STATUSES.includes(r.status);

const FILTERS = [
  { key: "upcoming", label: "Akan Datang", test: isUpcoming },
  { key: "history", label: "Riwayat", test: (r, today) => !isUpcoming(r, today) },
];

export default function CustomerReservations({ reservations, onBookNow, onChanged, onError }) {
  const [activeFilter, setActiveFilter] = useState("upcoming");
  const [updatingId, setUpdatingId] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [payments, setPayments] = useState(null);
  const today = todayWIB();

  // Riwayat pembayaran dimuat saat tab "Pembayaran" dibuka (dan setiap data reservasi berubah)
  useEffect(() => {
    if (activeFilter !== "payments") return;
    let ignore = false;
    paymentApi
      .mine()
      .then(({ payments }) => !ignore && setPayments(payments))
      .catch((err) => !ignore && onError(err.message));
    return () => {
      ignore = true;
    };
  }, [activeFilter, reservations, onError]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, reservations.filter((r) => f.test(r, today)).length])),
    [reservations, today]
  );

  const visible = useMemo(() => {
    const filter = FILTERS.find((f) => f.key === activeFilter);
    if (!filter) return [];
    const list = reservations.filter((r) => filter.test(r, today));
    return activeFilter === "upcoming" ? sortBySchedule(list) : list;
  }, [reservations, activeFilter, today]);

  const handleCancel = async (id) => {
    if (!window.confirm("Yakin ingin membatalkan reservasi ini?")) return;
    setUpdatingId(id);
    try {
      await reservationApi.cancel(id);
      await onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
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
          <button
            onClick={() => setActiveFilter("payments")}
            aria-pressed={activeFilter === "payments"}
            className={`shrink-0 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border transition-all ${
              activeFilter === "payments"
                ? "bg-charcoal text-white border-charcoal"
                : "bg-white text-charcoal/60 border-charcoal/10 hover:border-gold/40"
            }`}
          >
            <Receipt size={14} />
            Pembayaran
          </button>
        </div>
        <button
          onClick={onBookNow}
          className="inline-flex items-center gap-1.5 bg-gold-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-gold hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          Buat Reservasi
        </button>
      </div>

      {activeFilter === "payments" ? (
        <PaymentHistory payments={payments} onOpen={setReceiptId} />
      ) : visible.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-charcoal/10">
          <Calendar size={32} className="mx-auto text-gold/60" />
          <p className="mt-3 text-charcoal/55 text-sm">
            {activeFilter === "upcoming" ? "Kamu belum punya reservasi yang akan datang." : "Belum ada riwayat reservasi."}
          </p>
          {activeFilter === "upcoming" && (
            <button
              onClick={onBookNow}
              className="mt-5 inline-flex items-center gap-1.5 bg-gold-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-gold"
            >
              <Plus size={16} />
              Buat Reservasi Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.03 }}
              className="bg-white rounded-2xl border border-charcoal/5 p-5 md:p-6 shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-serif text-lg font-semibold text-charcoal">{r.service_name}</h3>
                <div className="flex items-center gap-2">
                  {r.payment_id && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                      <CheckCircle2 size={12} />
                      Lunas · {METHOD_LABEL[r.payment_method]}
                    </span>
                  )}
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLES[r.status] || ""}`}>
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-charcoal/65">
                <InfoRow icon={Calendar} label={formatDate(r.reservation_date)} />
                <InfoRow icon={Clock} label={`${timeOf(r)} WIB`} />
                <InfoRow icon={Phone} label={r.whatsapp} />
                <InfoRow icon={User} label={r.customer_name} />
              </div>

              {r.notes && (
                <p className="mt-3 text-sm text-charcoal/55 italic bg-offwhite rounded-xl px-4 py-2.5 break-words">
                  "{r.notes}"
                </p>
              )}

              {r.status === "pending" && (
                <p className="mt-3 flex items-start gap-2 text-xs text-charcoal/50">
                  <Info size={13} className="shrink-0 mt-0.5 text-gold-dark" />
                  Admin akan menghubungi kamu lewat WhatsApp untuk konfirmasi.
                </p>
              )}

              {r.payment_id && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-dashed border-charcoal/10">
                  <span className="text-sm text-charcoal/60">
                    Total dibayar <strong className="text-charcoal">{formatRupiah(r.payment_total)}</strong>
                  </span>
                  <button
                    onClick={() => setReceiptId(r.payment_id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark border border-gold/30 px-3 py-1.5 rounded-full hover:bg-gold/10"
                  >
                    <Receipt size={13} />
                    Lihat Struk
                  </button>
                </div>
              )}

              {(r.status === "pending" || r.status === "confirmed") && (
                <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-dashed border-charcoal/10">
                  {r.status === "pending" ? (
                    <button
                      disabled={updatingId === r.id}
                      onClick={() => handleCancel(r.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <XCircle size={13} />
                      Batalkan Reservasi
                    </button>
                  ) : (
                    <p className="text-xs text-charcoal/45">Perlu ubah jadwal / batal? Hubungi salon lewat WhatsApp.</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {receiptId && <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />}
    </div>
  );
}

function PaymentHistory({ payments, onOpen }) {
  if (!payments) {
    return <div className="h-32 bg-white rounded-2xl border border-charcoal/5 animate-pulse" />;
  }
  if (payments.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-charcoal/10">
        <Receipt size={32} className="mx-auto text-gold/60" />
        <p className="mt-3 text-charcoal/55 text-sm">Belum ada riwayat pembayaran.</p>
        <p className="mt-1 text-xs text-charcoal/40">Pembayaran dilakukan di salon (Cash / QRIS) setelah treatment selesai.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-charcoal/5 shadow-soft divide-y divide-charcoal/5">
      {payments.map((p) => (
        <button
          key={p.id}
          onClick={() => onOpen(p.id)}
          className={`w-full text-left flex items-center gap-3 px-5 py-4 hover:bg-gold/5 transition-colors ${p.status === "void" ? "opacity-60" : ""}`}
        >
          <Receipt size={18} className="text-gold-dark shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-charcoal truncate">{p.services}</span>
            <span className="block text-xs text-charcoal/45">
              {formatDateTime(p.paid_at)} · {SOURCE_LABEL[p.source]} · {METHOD_LABEL[p.method]}
              {p.status === "void" ? " · Dibatalkan" : ""}
            </span>
          </span>
          <span className={`font-semibold text-sm ${p.status === "void" ? "line-through text-charcoal/40" : "text-charcoal"}`}>
            {formatRupiah(p.total)}
          </span>
        </button>
      ))}
    </div>
  );
}

function InfoRow({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={14} className="text-gold-dark shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}
