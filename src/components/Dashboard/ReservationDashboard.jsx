// =====================================================================
// src/components/Dashboard/ReservationDashboard.jsx
// Kerangka halaman dashboard.
// Admin: tab Reservasi, Jadwal Harian, Kasir, Transaksi, Laporan, dan
// Testimoni (+ auto-refresh).
// Customer: daftar reservasi miliknya sendiri.
// =====================================================================
import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  RefreshCw,
  LogOut,
  ShieldCheck,
  User,
  Plus,
  ListChecks,
  CalendarRange,
  MessageSquareQuote,
  X,
  Calculator,
  Receipt,
  BarChart3,
} from "lucide-react";
import { reservationApi } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import AdminReservations from "./AdminReservations";
import AdminSchedule from "./AdminSchedule";
import AdminTestimonials from "./AdminTestimonials";
import CustomerReservations from "./CustomerReservations";
import AdminCashier from "./AdminCashier";
import AdminPayments from "./AdminPayments";
import AdminSalesReport from "./AdminSalesReport";
import ReceiptModal from "./ReceiptModal";
import { nowTimeWIB } from "./dashboardUtils";

// Admin: data reservasi dimuat ulang otomatis supaya booking baru langsung terlihat
const AUTO_REFRESH_MS = 60 * 1000;

const ADMIN_TABS = [
  { key: "reservations", label: "Reservasi", icon: ListChecks },
  { key: "schedule", label: "Jadwal Harian", icon: CalendarRange },
  { key: "cashier", label: "Kasir", icon: Calculator },
  { key: "payments", label: "Transaksi", icon: Receipt },
  { key: "report", label: "Laporan", icon: BarChart3 },
  { key: "testimonials", label: "Testimoni", icon: MessageSquareQuote },
];

/**
 * Props:
 * - onBack: kembali ke website
 * - onBookNow: buka form booking (admin: catat pelanggan walk-in / telepon)
 * - refreshKey: berubah setiap ada reservasi baru dibuat dari form booking
 */
export default function ReservationDashboard({ onBack, onBookNow, refreshKey }) {
  const { user, isAdmin, logout } = useAuth();
  const [tab, setTab] = useState("reservations");
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  // Naik setiap data berubah, supaya tampilan jadwal ikut memuat ulang kuota slot
  const [dataVersion, setDataVersion] = useState(0);
  // Reservasi yang dibuka di Kasir lewat tombol "Bayar"
  const [cashierReservationId, setCashierReservationId] = useState(null);
  // Struk yang baru saja dibuat di kasir
  const [lastPayment, setLastPayment] = useState(null);

  const loadReservations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true);
    try {
      const { reservations } = await reservationApi.list();
      setReservations(reservations);
      setLastUpdated(nowTimeWIB());
      setDataVersion((v) => v + 1);
      if (!silent) setError("");
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations, refreshKey]);

  // Auto-refresh untuk admin, hanya saat tab browser sedang dilihat
  useEffect(() => {
    if (!isAdmin) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadReservations({ silent: true });
    }, AUTO_REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && loadReservations({ silent: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAdmin, loadReservations]);

  // Ganti satu reservasi di state tanpa memuat ulang semuanya
  const handleUpdated = useCallback((updated) => {
    setError("");
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    setDataVersion((v) => v + 1);
  }, []);

  const showError = useCallback((message) => setError(message), []);

  const openCashier = useCallback((reservationId) => {
    setCashierReservationId(reservationId);
    setTab("cashier");
    window.scrollTo({ top: 0 });
  }, []);

  const handlePaid = useCallback(
    (payment) => {
      setLastPayment(payment);
      setCashierReservationId(null);
      loadReservations({ silent: true });
    },
    [loadReservations]
  );

  return (
    <div className="min-h-screen bg-offwhite">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-charcoal/5 shadow-soft">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gold/10 text-charcoal/60 hover:text-gold-dark transition-colors"
              aria-label="Kembali ke website"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="font-serif text-base sm:text-lg font-semibold text-charcoal flex items-center gap-2 whitespace-nowrap">
                {isAdmin ? (
                  <>
                    <ShieldCheck size={18} className="text-gold-dark" />
                    Dashboard Admin
                  </>
                ) : (
                  <>
                    <User size={18} className="text-gold-dark" />
                    Reservasi Saya
                  </>
                )}
              </h1>
              <p className="text-xs text-charcoal/45 truncate">
                {user?.name} · {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && lastUpdated && (
              <span className="hidden md:inline text-[11px] text-charcoal/40">Diperbarui {lastUpdated}</span>
            )}
            <button
              onClick={() => loadReservations()}
              disabled={isLoading}
              aria-label="Muat ulang"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/60 hover:text-gold-dark px-3 py-2 rounded-full hover:bg-gold/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {isAdmin && (
              <button
                onClick={onBookNow}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gold-gradient px-4 py-2 rounded-full shadow-gold"
                title="Catat reservasi pelanggan yang datang langsung / booking lewat telepon"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Tambah Reservasi</span>
              </button>
            )}
            <button
              onClick={logout}
              aria-label="Keluar"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-charcoal px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>

        {isAdmin && (
          <div className="max-w-6xl mx-auto px-5 md:px-8 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ADMIN_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key);
                  if (key !== "cashier") setCashierReservationId(null);
                }}
                aria-current={tab === key ? "page" : undefined}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? "border-gold text-charcoal"
                    : "border-transparent text-charcoal/50 hover:text-charcoal"
                }`}
              >
                <Icon size={15} className={tab === key ? "text-gold-dark" : ""} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8">
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
          >
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Tutup pesan" className="shrink-0 hover:text-red-800">
              <X size={16} />
            </button>
          </div>
        )}

        {isLoading && reservations.length === 0 ? (
          <div className="grid gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-36 bg-white rounded-2xl border border-charcoal/5 animate-pulse" />
            ))}
          </div>
        ) : !isAdmin ? (
          <CustomerReservations
            reservations={reservations}
            onBookNow={onBookNow}
            onChanged={() => loadReservations({ silent: true })}
            onError={showError}
          />
        ) : tab === "reservations" ? (
          <AdminReservations
            reservations={reservations}
            onUpdated={handleUpdated}
            onError={showError}
            onPay={openCashier}
          />
        ) : tab === "schedule" ? (
          <AdminSchedule reservations={reservations} refreshKey={dataVersion} />
        ) : tab === "cashier" ? (
          <AdminCashier
            reservations={reservations}
            initialReservationId={cashierReservationId}
            onPaid={handlePaid}
          />
        ) : tab === "payments" ? (
          <AdminPayments
            refreshKey={dataVersion}
            onChanged={() => loadReservations({ silent: true })}
            onError={showError}
          />
        ) : tab === "report" ? (
          <AdminSalesReport refreshKey={dataVersion} onError={showError} />
        ) : (
          <AdminTestimonials onError={showError} />
        )}
      </div>

      {lastPayment && (
        <ReceiptModal payment={lastPayment} onClose={() => setLastPayment(null)} showWhatsApp />
      )}
    </div>
  );
}
