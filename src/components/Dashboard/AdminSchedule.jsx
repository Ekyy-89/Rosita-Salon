// =====================================================================
// src/components/Dashboard/AdminSchedule.jsx
// Tampilan jadwal per hari untuk admin: setiap slot jam menampilkan
// siapa saja yang datang dan berapa kapasitas yang masih tersisa.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Scissors } from "lucide-react";
import { reservationApi } from "../../api/client";
import {
  STATUS_LABEL,
  STATUS_DOT,
  todayWIB,
  addDays,
  formatDate,
  timeOf,
  sortBySchedule,
} from "./dashboardUtils";

export default function AdminSchedule({ reservations, refreshKey }) {
  const today = todayWIB();
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState([]);
  const [capacity, setCapacity] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    setError("");
    reservationApi
      .availability(date)
      .then((data) => {
        if (ignore) return;
        setSlots(data.slots);
        setCapacity(data.capacity || 1);
      })
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [date, refreshKey]);

  const dayReservations = useMemo(
    () => sortBySchedule(reservations.filter((r) => r.reservation_date === date && r.status !== "cancelled")),
    [reservations, date]
  );

  const slotTimes = slots.map((s) => s.time);
  // Reservasi lama di jam yang tidak sesuai slot (data sebelum sistem slot dipakai)
  const offSlot = dayReservations.filter((r) => !slotTimes.includes(timeOf(r)));
  const cancelledCount = reservations.filter((r) => r.reservation_date === date && r.status === "cancelled").length;

  return (
    <div>
      {/* Navigasi tanggal */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            aria-label="Hari sebelumnya"
            className="w-9 h-9 rounded-full border border-charcoal/10 bg-white flex items-center justify-center hover:border-gold/40"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-[190px] text-center">
            <p className="font-serif text-lg font-semibold text-charcoal">
              {formatDate(date, { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <p className="text-xs text-charcoal/45">
              {date === today ? "Hari ini" : date === addDays(today, 1) ? "Besok" : formatDate(date, { year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            aria-label="Hari berikutnya"
            className="w-9 h-9 rounded-full border border-charcoal/10 bg-white flex items-center justify-center hover:border-gold/40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {date !== today && (
            <button
              onClick={() => setDate(today)}
              className="text-xs font-semibold text-gold-dark px-3 py-2 rounded-full hover:bg-gold/10"
            >
              Ke hari ini
            </button>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Pilih tanggal"
            className="rounded-full border border-charcoal/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4 text-xs text-charcoal/50">
        <span>
          <strong className="text-charcoal">{dayReservations.length}</strong> pelanggan
        </span>
        <span>
          Kapasitas <strong className="text-charcoal">{capacity}</strong> orang / jam
        </span>
        {cancelledCount > 0 && <span>{cancelledCount} dibatalkan (tidak ditampilkan)</span>}
        <span className="flex items-center gap-3">
          {["pending", "confirmed", "done"].map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </span>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-charcoal/5 shadow-soft divide-y divide-charcoal/5">
        {slots.map((slot) => {
          const booked = dayReservations.filter((r) => timeOf(r) === slot.time);
          const filled = capacity - slot.remaining;
          const full = slot.remaining === 0;
          const past = !slot.available && !full;
          return (
            <div key={slot.time} className={`flex items-stretch gap-4 px-4 py-3 ${past ? "bg-charcoal/[0.015]" : ""}`}>
              <div className="w-14 shrink-0 pt-1">
                <p className={`font-semibold ${past ? "text-charcoal/40" : "text-charcoal"}`}>{slot.time}</p>
                <p className={`text-[11px] font-semibold ${full ? "text-red-500" : "text-charcoal/40"}`}>
                  {full ? "Penuh" : past ? "Lewat" : `${slot.remaining} kosong`}
                </p>
              </div>
              <div className="flex-1 flex flex-wrap gap-2 items-center min-h-[40px]">
                {booked.length === 0 ? (
                  <span className="text-xs text-charcoal/25">—</span>
                ) : (
                  booked.map((r) => <BookingChip key={r.id} reservation={r} />)
                )}
              </div>
              <div className="hidden sm:flex items-center gap-1 shrink-0" aria-hidden="true">
                {Array.from({ length: capacity }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2.5 h-2.5 rounded-full ${i < filled ? "bg-gold" : "bg-charcoal/10"}`}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {offSlot.length > 0 && (
          <div className="flex items-stretch gap-4 px-4 py-3 bg-offwhite">
            <div className="w-14 shrink-0 pt-1 text-xs font-semibold text-charcoal/50">Lainnya</div>
            <div className="flex-1 flex flex-wrap gap-2">
              {offSlot.map((r) => (
                <BookingChip key={r.id} reservation={r} showTime />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingChip({ reservation: r, showTime }) {
  return (
    <span
      title={`${r.customer_name} · ${r.service_name} · ${STATUS_LABEL[r.status]}${r.notes ? `\nCatatan: ${r.notes}` : ""}`}
      className="inline-flex items-center gap-2 bg-offwhite border border-charcoal/5 rounded-xl px-3 py-1.5 text-xs max-w-full"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[r.status]}`} />
      <span className="font-semibold text-charcoal truncate">
        {showTime && `${timeOf(r)} · `}
        {r.customer_name}
      </span>
      <span className="hidden md:inline-flex items-center gap-1 text-charcoal/50 truncate">
        <Scissors size={11} />
        {r.service_name}
      </span>
    </span>
  );
}
