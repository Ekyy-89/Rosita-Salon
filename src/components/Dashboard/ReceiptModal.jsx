// =====================================================================
// src/components/Dashboard/ReceiptModal.jsx
// Struk pembayaran: bisa dicetak (ukuran printer kasir 58/80mm) atau
// dikirim ke WhatsApp customer. Dipakai admin & customer.
// =====================================================================
import { useEffect, useState } from "react";
import { Printer, MessageCircle, X } from "lucide-react";
import { paymentApi } from "../../api/client";
import { SALON_INFO } from "../../data/salonData";
import { METHOD_LABEL, SOURCE_LABEL, formatRupiah, formatDateTime, receiptWhatsAppUrl } from "./dashboardUtils";

/**
 * Props:
 * - paymentId: id transaksi yang ditampilkan (null = modal tertutup)
 * - payment: data lengkap (opsional; kalau ada, tidak perlu ambil ulang dari server)
 * - onClose
 * - showWhatsApp: tampilkan tombol kirim WA (untuk admin)
 */
export default function ReceiptModal({ paymentId, payment: initial, onClose, showWhatsApp = false }) {
  const [payment, setPayment] = useState(initial || null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) {
      setPayment(initial);
      return;
    }
    if (!paymentId) return;
    let ignore = false;
    setPayment(null);
    setError("");
    paymentApi
      .get(paymentId)
      .then(({ payment }) => !ignore && setPayment(payment))
      .catch((err) => !ignore && setError(err.message));
    return () => {
      ignore = true;
    };
  }, [paymentId, initial]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 print:static print:block print:p-0">
      <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm print:hidden" onClick={onClose} />
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl print:max-h-none print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal/5 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-charcoal">Struk Pembayaran</h3>
          <button
            onClick={onClose}
            aria-label="Tutup struk"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gold/10 text-charcoal/60"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : !payment ? (
          <p className="p-6 text-sm text-charcoal/40">Memuat struk...</p>
        ) : (
          <>
            <div id="receipt-print" className="px-6 py-5 font-mono text-[12px] leading-relaxed text-charcoal">
              <div className="text-center">
                <p className="font-serif text-base font-bold">{SALON_INFO.name}</p>
                <p className="text-[11px] text-charcoal/60">{SALON_INFO.phone}</p>
                <p className="text-[11px] text-charcoal/60">IG @{SALON_INFO.instagram}</p>
              </div>
              <Divider />
              <Row label="No" value={payment.invoice_no} />
              <Row label="Tanggal" value={formatDateTime(payment.paid_at)} />
              <Row label="Pelanggan" value={payment.customer_name} />
              <Row label="Jenis" value={SOURCE_LABEL[payment.source]} />
              {payment.cashier_name && <Row label="Kasir" value={payment.cashier_name} />}
              <Divider />
              {payment.items.map((item, i) => (
                <div key={i} className="mb-1">
                  <p className="font-semibold">{item.service_name}</p>
                  <Row label={`${item.qty} x ${formatRupiah(item.price)}`} value={formatRupiah(item.subtotal)} />
                </div>
              ))}
              <Divider />
              <Row label="Subtotal" value={formatRupiah(payment.subtotal)} />
              {payment.discount > 0 && <Row label="Diskon" value={`-${formatRupiah(payment.discount)}`} />}
              <Row label="TOTAL" value={formatRupiah(payment.total)} bold />
              <Row label="Metode" value={METHOD_LABEL[payment.method]} />
              {payment.method === "cash" && (
                <>
                  <Row label="Tunai" value={formatRupiah(payment.cash_received)} />
                  <Row label="Kembali" value={formatRupiah(payment.change_amount)} />
                </>
              )}
              {payment.status === "void" && (
                <p className="mt-3 text-center font-bold text-red-600 border border-red-300 rounded py-1">
                  DIBATALKAN{payment.void_reason ? ` · ${payment.void_reason}` : ""}
                </p>
              )}
              <Divider />
              <p className="text-center text-[11px] text-charcoal/60">
                Terima kasih sudah datang ✨
                <br />
                {SALON_INFO.tagline}
              </p>
            </div>

            <div className="flex gap-2 px-5 pb-5 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-charcoal text-white px-4 py-2.5 rounded-full"
              >
                <Printer size={15} />
                Cetak
              </button>
              {showWhatsApp && (
                <a
                  href={receiptWhatsAppUrl(payment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-full hover:bg-emerald-50"
                >
                  <MessageCircle size={15} />
                  Kirim WA
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-bold text-[13px]" : ""}`}>
      <span className="text-charcoal/70 shrink-0">{label}</span>
      <span className="text-right break-words min-w-0">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-2.5 border-t border-dashed border-charcoal/25" />;
}
