// =====================================================================
// src/components/Dashboard/AdminPayments.jsx
// Riwayat transaksi kasir: filter tanggal/metode, lihat struk, batalkan (void).
// =====================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Receipt, Ban, Wallet } from "lucide-react";
import { paymentApi } from "../../api/client";
import ReceiptModal from "./ReceiptModal";
import { METHOD_LABEL, SOURCE_LABEL, todayWIB, formatRupiah, formatDateTime } from "./dashboardUtils";
import { DateRangePicker } from "./AdminSalesReport";

const METHOD_FILTERS = [
  { key: "all", label: "Semua" },
  { key: "cash", label: "Cash" },
  { key: "qris", label: "QRIS" },
  { key: "void", label: "Dibatalkan" },
];

export default function AdminPayments({ refreshKey, onChanged, onError }) {
  const today = todayWIB();
  const [range, setRange] = useState({ from: today, to: today });
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [receiptId, setReceiptId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { payments } = await paymentApi.list(range);
      setPayments(payments);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }, [range, onError]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (filter === "void" ? p.status !== "void" : filter !== "all" && (p.method !== filter || p.status === "void")) {
        return false;
      }
      if (!q) return true;
      return [p.invoice_no, p.customer_name, p.whatsapp, p.services].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [payments, filter, query]);

  const paid = payments.filter((p) => p.status === "paid");
  const totalPaid = paid.reduce((s, p) => s + p.total, 0);

  const voidPayment = async (p) => {
    const reason = window.prompt(
      `Batalkan transaksi ${p.invoice_no} (${formatRupiah(p.total)})?\nTulis alasannya (mis. salah input):`
    );
    if (reason === null) return;
    try {
      await paymentApi.void(p.id, reason);
      await load();
      onChanged();
    } catch (err) {
      onError(err.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <DateRangePicker range={range} onChange={setRange} />
        <div className="flex items-center gap-2 text-sm text-charcoal/60">
          <Wallet size={16} className="text-gold-dark" />
          <span>
            <strong className="text-charcoal">{paid.length}</strong> transaksi ·{" "}
            <strong className="text-charcoal">{formatRupiah(totalPaid)}</strong>
          </span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
        <label className="relative md:w-72 shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal/35" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari no. nota, nama, layanan..."
            aria-label="Cari transaksi"
            className="w-full rounded-full border border-charcoal/10 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </label>
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {METHOD_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`shrink-0 text-sm font-medium px-4 py-2 rounded-full border transition-all ${
                filter === f.key ? "bg-charcoal text-white border-charcoal" : "bg-white text-charcoal/60 border-charcoal/10 hover:border-gold/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && payments.length === 0 ? (
        <div className="h-40 bg-white rounded-2xl border border-charcoal/5 animate-pulse" />
      ) : visible.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-charcoal/10">
          <Receipt size={30} className="mx-auto text-gold/60" />
          <p className="mt-3 text-charcoal/55 text-sm">Belum ada transaksi di periode ini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-charcoal/5 shadow-soft divide-y divide-charcoal/5">
          {visible.map((p) => (
            <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 ${p.status === "void" ? "opacity-60" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm text-charcoal">{p.customer_name}</span>
                  <Badge>{SOURCE_LABEL[p.source]}</Badge>
                  <Badge tone={p.method === "qris" ? "blue" : "green"}>{METHOD_LABEL[p.method]}</Badge>
                  {p.status === "void" && <Badge tone="red">Dibatalkan</Badge>}
                </div>
                <p className="text-xs text-charcoal/50 truncate mt-0.5">{p.services}</p>
                <p className="text-[11px] text-charcoal/40 mt-0.5">
                  {p.invoice_no} · {formatDateTime(p.paid_at)}
                  {p.cashier_name ? ` · Kasir ${p.cashier_name}` : ""}
                  {p.status === "void" && p.void_reason ? ` · Alasan: ${p.void_reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <span className={`font-serif text-lg font-semibold ${p.status === "void" ? "line-through text-charcoal/40" : "text-charcoal"}`}>
                  {formatRupiah(p.total)}
                </span>
                <button
                  onClick={() => setReceiptId(p.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold border border-charcoal/15 text-charcoal/70 px-3 py-1.5 rounded-full hover:border-gold/40"
                >
                  <Receipt size={13} /> Struk
                </button>
                {p.status === "paid" && (
                  <button
                    onClick={() => voidPayment(p)}
                    className="inline-flex items-center gap-1 text-xs font-semibold border border-red-200 text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50"
                  >
                    <Ban size={13} /> Batalkan
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {receiptId && <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} showWhatsApp />}
    </div>
  );
}

export function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-charcoal/5 text-charcoal/55",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    red: "bg-red-50 text-red-600",
    gold: "bg-gold/10 text-gold-dark",
  };
  return <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}
