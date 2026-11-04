// =====================================================================
// src/components/Dashboard/AdminSalesReport.jsx
// Laporan penjualan: omzet, Cash vs QRIS, booking online vs walk-in,
// omzet per hari, layanan terlaris, dan export CSV (bisa dibuka di Excel).
// =====================================================================
import { useEffect, useState } from "react";
import { Wallet, Receipt, Tag, Ban, Download, Banknote, QrCode, CalendarCheck, Store } from "lucide-react";
import { paymentApi } from "../../api/client";
import { todayWIB, addDays, formatDate, formatRupiah, formatDateTime, METHOD_LABEL, SOURCE_LABEL } from "./dashboardUtils";

const PRESETS = [
  { key: "today", label: "Hari Ini" },
  { key: "week", label: "7 Hari" },
  { key: "month", label: "Bulan Ini" },
];

function presetRange(key, today = todayWIB()) {
  return {
    today: { from: today, to: today },
    week: { from: addDays(today, -6), to: today },
    month: { from: `${today.slice(0, 7)}-01`, to: today },
  }[key];
}

export default function AdminSalesReport({ refreshKey, onError }) {
  const [range, setRange] = useState(() => presetRange("month"));
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let ignore = false;
    paymentApi
      .report(range)
      .then((data) => !ignore && setReport(data))
      .catch((err) => !ignore && onError(err.message));
    return () => {
      ignore = true;
    };
  }, [range, refreshKey, onError]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { payments } = await paymentApi.list(range);
      const header = ["No Nota", "Waktu", "Pelanggan", "No WA", "Jenis", "Layanan", "Subtotal", "Diskon", "Total", "Metode", "Status", "Kasir"];
      const rows = payments.map((p) => [
        p.invoice_no,
        formatDateTime(p.paid_at),
        p.customer_name,
        p.whatsapp || "",
        SOURCE_LABEL[p.source],
        p.services,
        p.subtotal,
        p.discount,
        p.total,
        METHOD_LABEL[p.method],
        p.status === "void" ? `Dibatalkan (${p.void_reason || "-"})` : "Lunas",
        p.cashier_name || "",
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
        .join("\r\n");
      // BOM supaya Excel membaca huruf/emoji dengan benar; pemisah ";" sesuai Excel Indonesia
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-penjualan-${range.from}_${range.to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      onError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const s = report?.summary;
  const method = (key) => report?.byMethod.find((m) => m.method === key) || { transactions: 0, revenue: 0 };
  const source = (key) => report?.bySource.find((m) => m.source === key) || { transactions: 0, revenue: 0 };
  const maxDay = Math.max(1, ...(report?.byDay.map((d) => d.revenue) || [0]));

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <DateRangePicker range={range} onChange={setRange} />
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="self-start inline-flex items-center gap-1.5 text-sm font-semibold border border-charcoal/15 bg-white text-charcoal/70 px-4 py-2 rounded-full hover:border-gold/40 disabled:opacity-50"
        >
          <Download size={15} />
          {exporting ? "Menyiapkan..." : "Export CSV (Excel)"}
        </button>
      </div>

      {!report ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white rounded-2xl border border-charcoal/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat icon={Wallet} label="Omzet" value={formatRupiah(s.revenue)} />
            <Stat icon={Receipt} label="Transaksi" value={s.transactions} />
            <Stat icon={Tag} label="Total diskon" value={formatRupiah(s.discount)} />
            <Stat icon={Ban} label="Dibatalkan" value={s.voided} />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <SplitCard
              title="Metode Pembayaran"
              total={s.revenue}
              parts={[
                { icon: Banknote, label: "Cash", color: "bg-emerald-500", ...method("cash") },
                { icon: QrCode, label: "QRIS", color: "bg-sky-500", ...method("qris") },
              ]}
            />
            <SplitCard
              title="Asal Pelanggan"
              total={s.revenue}
              parts={[
                { icon: CalendarCheck, label: "Booking Online", color: "bg-gold", ...source("booking") },
                { icon: Store, label: "Walk-in", color: "bg-charcoal/60", ...source("walkin") },
              ]}
            />
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-3 items-start">
            <Panel title="Omzet per Hari">
              {report.byDay.length === 0 ? (
                <Empty />
              ) : (
                <div className="space-y-2">
                  {report.byDay.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-xs">
                      <span className="w-20 shrink-0 text-charcoal/55">
                        {formatDate(d.date, { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                      <div className="flex-1 h-5 bg-charcoal/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gold-gradient rounded-full" style={{ width: `${(d.revenue / maxDay) * 100}%` }} />
                      </div>
                      <span className="w-24 shrink-0 text-right font-semibold text-charcoal">{formatRupiah(d.revenue)}</span>
                      <span className="w-10 shrink-0 text-right text-charcoal/40">{d.transactions}x</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Layanan Terlaris">
              {report.topServices.length === 0 ? (
                <Empty />
              ) : (
                <ol className="space-y-2">
                  {report.topServices.map((t, i) => (
                    <li key={t.service_name} className="flex items-center gap-3 text-sm">
                      <span className="w-5 text-xs font-semibold text-gold-dark">{i + 1}.</span>
                      <span className="flex-1 min-w-0 truncate text-charcoal">{t.service_name}</span>
                      <span className="text-xs text-charcoal/45">{t.qty}x</span>
                      <span className="w-24 text-right text-xs font-semibold">{formatRupiah(t.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

// Pilihan periode: preset (hari ini / 7 hari / bulan ini) atau tanggal bebas
export function DateRangePicker({ range, onChange }) {
  const today = todayWIB();
  const active = PRESETS.find((p) => {
    const r = presetRange(p.key, today);
    return r.from === range.from && r.to === range.to;
  })?.key;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(presetRange(p.key, today))}
          aria-pressed={active === p.key}
          className={`text-sm font-medium px-4 py-2 rounded-full border transition-all ${
            active === p.key ? "bg-charcoal text-white border-charcoal" : "bg-white text-charcoal/60 border-charcoal/10 hover:border-gold/40"
          }`}
        >
          {p.label}
        </button>
      ))}
      <span className="inline-flex items-center gap-1.5 text-xs text-charcoal/50">
        <input
          type="date"
          value={range.from}
          max={today}
          onChange={(e) => e.target.value && onChange({ from: e.target.value, to: e.target.value > range.to ? e.target.value : range.to })}
          aria-label="Dari tanggal"
          className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        s/d
        <input
          type="date"
          value={range.to}
          min={range.from}
          max={today}
          onChange={(e) => e.target.value && onChange({ ...range, to: e.target.value })}
          aria-label="Sampai tanggal"
          className="rounded-full border border-charcoal/10 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </span>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-charcoal/5 p-4 shadow-soft">
      <span className="flex items-center gap-2 text-xs text-charcoal/50">
        <Icon size={14} className="text-gold-dark" />
        {label}
      </span>
      <span className="block mt-1.5 font-serif text-xl md:text-2xl font-semibold text-charcoal">{value}</span>
    </div>
  );
}

function SplitCard({ title, total, parts }) {
  return (
    <Panel title={title}>
      <div className="flex h-3 rounded-full overflow-hidden bg-charcoal/5 mb-3">
        {parts.map((p) => (
          <div key={p.label} className={p.color} style={{ width: total ? `${(p.revenue / total) * 100}%` : 0 }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {parts.map(({ icon: Icon, ...p }) => (
          <div key={p.label}>
            <p className="flex items-center gap-1.5 text-xs text-charcoal/55">
              <span className={`w-2 h-2 rounded-full ${p.color}`} />
              <Icon size={13} />
              {p.label}
            </p>
            <p className="font-semibold text-charcoal">{formatRupiah(p.revenue)}</p>
            <p className="text-[11px] text-charcoal/40">
              {p.transactions} transaksi{total ? ` · ${Math.round((p.revenue / total) * 100)}%` : ""}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-charcoal/5 shadow-soft p-4 md:p-5">
      <h3 className="font-serif text-base font-semibold text-charcoal mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-charcoal/40 py-4 text-center">Belum ada transaksi di periode ini.</p>;
}
