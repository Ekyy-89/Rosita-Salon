// =====================================================================
// src/components/Dashboard/CustomerReservations.jsx
// Customer: lihat reservasi MILIK SENDIRI (bisa batalkan kalau masih pending)
// =====================================================================
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Phone, User, XCircle, Plus, Info } from "lucide-react";
import { reservationApi } from "../../api/client";
import {
  STATUS_LABEL,
  STATUS_STYLES,
  ACTIVE_STATUSES,
  todayWIB,
  formatDate,
  timeOf,
  sortBySchedule,
} from "./dashboardUtils";

const isUpcoming = (r, today) => r.reservation_date >= today && ACTIVE_STATUSES.includes(r.status);

const FILTERS = [
  { key: "upcoming", label: "Akan Datang", test: isUpcoming },
  { key: "history", label: "Riwayat", test: (r, today) => !isUpcoming(r, today) },
];

export default function CustomerReservations({ reservations, onBookNow, onChanged, onError }) {
  const [activeFilter, setActiveFilter] = useState("upcoming");
  const [updatingId, setUpdatingId] = useState(null);
  const today = todayWIB();

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, reservations.filter((r) => f.test(r, today)).length])),
    [reservations, today]
  );

  const visible = useMemo(() => {
    const filter = FILTERS.find((f) => f.key === activeFilter);
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
        </div>
        <button
          onClick={onBookNow}
          className="inline-flex items-center gap-1.5 bg-gold-gradient text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-gold hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          Buat Reservasi
        </button>
      </div>

      {visible.length === 0 ? (
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
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLES[r.status] || ""}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
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
