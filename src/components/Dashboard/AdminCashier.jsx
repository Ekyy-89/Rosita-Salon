// =====================================================================
// src/components/Dashboard/AdminCashier.jsx
// Kasir (POS) untuk admin: bayar reservasi online yang sudah dilayani,
// atau catat pelanggan walk-in. Metode pembayaran: Cash & QRIS (statis).
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck,
  Store,
  Search,
  Plus,
  Minus,
  Trash2,
  Banknote,
  QrCode,
  UserCheck,
  X,
  Upload,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { paymentApi, settingsApi } from "../../api/client";
import { BOOKING_GROUPS, findBookingOption } from "../../data/salonData";
import {
  ACTIVE_STATUSES,
  todayWIB,
  formatDate,
  timeOf,
  sortBySchedule,
  formatRupiah,
  parsePrice,
} from "./dashboardUtils";

const CUSTOM_OPTION = "__custom__";
let itemKey = 0;
const newItem = (serviceName = "", price = 0) => ({ key: ++itemKey, serviceName, price, qty: 1 });

const itemsForService = (serviceName) =>
  serviceName ? [newItem(serviceName, parsePrice(findBookingOption(serviceName)?.price))] : [];

/**
 * Props:
 * - reservations: semua reservasi (dari dashboard)
 * - initialReservationId: reservasi yang dipilih lewat tombol "Bayar"
 * - onPaid(payment): dipanggil setelah transaksi tersimpan
 */
export default function AdminCashier({ reservations, initialReservationId, onPaid }) {
  const today = todayWIB();
  const [source, setSource] = useState("booking");
  const [reservationId, setReservationId] = useState(initialReservationId || null);

  // Walk-in
  const [linkedUser, setLinkedUser] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [slotWarning, setSlotWarning] = useState("");

  // Reservasi yang bisa dibayar: aktif, belum dibayar, tanggalnya hari ini / sudah lewat
  const payable = useMemo(
    () =>
      sortBySchedule(
        reservations.filter(
          (r) => ACTIVE_STATUSES.includes(r.status) && !r.payment_id && r.reservation_date <= today
        ),
        "desc"
      ),
    [reservations, today]
  );
  const selected = payable.find((r) => r.id === reservationId) || null;

  // Pilih reservasi dari tombol "Bayar" / dari daftar -> layanan langsung terisi
  useEffect(() => {
    if (!initialReservationId) return;
    const r = reservations.find((x) => x.id === initialReservationId);
    setSource("booking");
    setReservationId(initialReservationId);
    setItems(itemsForService(r?.service_name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReservationId]);

  const pickReservation = (r) => {
    setReservationId(r.id);
    setItems(itemsForService(r.service_name));
    setError("");
  };

  const switchSource = (next) => {
    setSource(next);
    setError("");
    setSlotWarning("");
    if (next === "walkin") {
      setReservationId(null);
      setItems([]);
    } else {
      setLinkedUser(null);
      setCustomerName("");
      setWhatsapp("");
      setItems([]);
    }
  };

  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * i.qty, 0);
  const discountValue = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - discountValue;
  const cashValue = Number(cashReceived) || 0;
  const change = cashValue - total;

  const hasCustomer = source === "booking" ? Boolean(selected) : Boolean(linkedUser || customerName.trim().length >= 2);
  const itemsValid = items.length > 0 && items.every((i) => i.serviceName.trim() && Number(i.price) >= 0);
  const paymentValid = method === "qris" || cashValue >= total;
  const canSubmit = hasCustomer && itemsValid && paymentValid && !submitting;

  const resetForm = () => {
    setReservationId(null);
    setLinkedUser(null);
    setCustomerName("");
    setWhatsapp("");
    setItems([]);
    setDiscount(0);
    setCashReceived("");
    setNotes("");
    setSlotWarning("");
  };

  const submit = async (force = false) => {
    setSubmitting(true);
    setError("");
    try {
      const { payment } = await paymentApi.create({
        reservationId: source === "booking" ? reservationId : undefined,
        userId: source === "walkin" ? linkedUser?.id : undefined,
        customerName: source === "walkin" ? customerName : undefined,
        whatsapp: source === "walkin" ? whatsapp : undefined,
        items: items.map((i) => ({ serviceName: i.serviceName, price: Number(i.price) || 0, qty: i.qty })),
        discount: discountValue,
        method,
        cashReceived: method === "cash" ? cashValue : undefined,
        notes,
        force,
      });
      resetForm();
      onPaid(payment);
    } catch (err) {
      if (err.status === 409 && /Tetap simpan/.test(err.message)) {
        setSlotWarning(err.message);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
      {/* ================= KIRI: pelanggan & layanan ================= */}
      <div className="space-y-5">
        <Card>
          <div className="flex bg-offwhite rounded-full p-1 mb-4">
            <SourceTab active={source === "booking"} icon={CalendarCheck} onClick={() => switchSource("booking")}>
              Dari Reservasi
            </SourceTab>
            <SourceTab active={source === "walkin"} icon={Store} onClick={() => switchSource("walkin")}>
              Walk-in
            </SourceTab>
          </div>

          {source === "booking" ? (
            payable.length === 0 ? (
              <p className="text-sm text-charcoal/50 py-6 text-center">
                Tidak ada reservasi yang menunggu pembayaran hari ini.
                <br />
                Pelanggan datang langsung? Pakai tab <strong>Walk-in</strong>.
              </p>
            ) : (
              <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
                {payable.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => pickReservation(r)}
                    className={`text-left flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                      reservationId === r.id
                        ? "border-gold bg-gold/10 ring-2 ring-gold/20"
                        : "border-charcoal/10 bg-white hover:border-gold/40"
                    }`}
                  >
                    <span className="font-serif text-lg font-semibold text-charcoal w-14 shrink-0">{timeOf(r)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-sm text-charcoal truncate">{r.customer_name}</span>
                      <span className="block text-xs text-charcoal/50 truncate">{r.service_name}</span>
                    </span>
                    <span className="text-[11px] text-charcoal/40 shrink-0">
                      {r.reservation_date === today ? "Hari ini" : formatDate(r.reservation_date, { day: "numeric", month: "short" })}
                    </span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <WalkInCustomer
              linkedUser={linkedUser}
              onLink={(u) => {
                setLinkedUser(u);
                setCustomerName("");
                setWhatsapp(u?.phone || "");
              }}
              customerName={customerName}
              setCustomerName={setCustomerName}
              whatsapp={whatsapp}
              setWhatsapp={setWhatsapp}
            />
          )}
        </Card>

        <Card title="Layanan">
          <ItemsEditor items={items} setItems={setItems} />
        </Card>
      </div>

      {/* ================= KANAN: pembayaran ================= */}
      <div className="lg:sticky lg:top-36 space-y-4">
        <Card title="Pembayaran">
          <div className="space-y-2 text-sm">
            <SumRow label="Subtotal" value={formatRupiah(subtotal)} />
            <label className="flex items-center justify-between gap-3">
              <span className="text-charcoal/60">Diskon</span>
              <MoneyInput value={discount} onChange={setDiscount} className="w-32" />
            </label>
            <div className="border-t border-dashed border-charcoal/15 pt-2">
              <SumRow label="Total" value={formatRupiah(total)} bold />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <MethodButton active={method === "cash"} icon={Banknote} onClick={() => setMethod("cash")}>
              Cash
            </MethodButton>
            <MethodButton active={method === "qris"} icon={QrCode} onClick={() => setMethod("qris")}>
              QRIS
            </MethodButton>
          </div>

          {method === "cash" ? (
            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-charcoal/60">
                Uang diterima
                <MoneyInput value={cashReceived} onChange={setCashReceived} className="w-full mt-1" placeholder="0" />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[total, 50000, 100000, 200000]
                  .filter((v, i, arr) => v > 0 && (i === 0 || v > total) && arr.indexOf(v) === i)
                  .map((v, i) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCashReceived(String(v))}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-charcoal/10 hover:border-gold/50"
                    >
                      {i === 0 ? "Uang pas" : formatRupiah(v)}
                    </button>
                  ))}
              </div>
              <SumRow
                label="Kembalian"
                value={cashReceived === "" ? "-" : change >= 0 ? formatRupiah(change) : `Kurang ${formatRupiah(-change)}`}
                bold
                danger={cashReceived !== "" && change < 0}
              />
            </div>
          ) : (
            <QrisPanel total={total} />
          )}

          <label className="block mt-4 text-xs font-semibold text-charcoal/60">
            Catatan (opsional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
              placeholder="mis. rambut panjang +Rp20.000"
              className="mt-1 w-full rounded-xl border border-charcoal/10 bg-offwhite px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
            />
          </label>

          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}

          {slotWarning ? (
            <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
              <p className="flex gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                {slotWarning}
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setSlotWarning("")} className="text-xs font-semibold px-3 py-1.5">
                  Batal
                </button>
                <button
                  onClick={() => submit(true)}
                  disabled={submitting}
                  className="text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-full"
                >
                  Tetap Simpan
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => submit(false)}
              disabled={!canSubmit}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gold-gradient text-white font-semibold px-6 py-3.5 rounded-full shadow-gold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Receipt size={17} />
              {submitting
                ? "Menyimpan..."
                : method === "qris"
                  ? `Sudah Dibayar via QRIS · ${formatRupiah(total)}`
                  : `Proses Pembayaran · ${formatRupiah(total)}`}
            </button>
          )}
          {!hasCustomer && (
            <p className="mt-2 text-[11px] text-center text-charcoal/40">
              {source === "booking" ? "Pilih reservasi yang akan dibayar." : "Isi nama pelanggan atau pilih akunnya."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

// -------------------------------------------------
// Walk-in: kaitkan ke akun customer atau isi nama manual
// -------------------------------------------------
function WalkInCustomer({ linkedUser, onLink, customerName, setCustomerName, whatsapp, setWhatsapp }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let ignore = false;
    setSearching(true);
    const timer = setTimeout(() => {
      paymentApi
        .searchCustomers(q)
        .then(({ customers }) => !ignore && setResults(customers))
        .catch(() => !ignore && setResults([]))
        .finally(() => !ignore && setSearching(false));
    }, 300);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  if (linkedUser) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3">
        <UserCheck size={18} className="text-gold-dark shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-charcoal truncate">{linkedUser.name}</p>
          <p className="text-xs text-charcoal/50 truncate">
            {linkedUser.email}
            {linkedUser.phone ? ` · ${linkedUser.phone}` : ""}
          </p>
        </div>
        <button onClick={() => onLink(null)} aria-label="Lepas akun" className="text-charcoal/40 hover:text-charcoal">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-3 text-charcoal/35" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari akun customer (nama, email, no. WA)..."
          className="w-full rounded-xl border border-charcoal/10 bg-offwhite pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        {query.trim().length >= 2 && (
          <div className="mt-1 rounded-xl border border-charcoal/10 bg-white divide-y divide-charcoal/5 overflow-hidden">
            {searching && results.length === 0 ? (
              <p className="px-4 py-2.5 text-xs text-charcoal/40">Mencari...</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-2.5 text-xs text-charcoal/40">Akun tidak ditemukan. Isi nama manual di bawah.</p>
            ) : (
              results.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    onLink(u);
                    setQuery("");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gold/5"
                >
                  <span className="block text-sm font-semibold text-charcoal">{u.name}</span>
                  <span className="block text-xs text-charcoal/50">
                    {u.email}
                    {u.phone ? ` · ${u.phone}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] text-charcoal/40 text-center">— atau pelanggan tanpa akun —</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nama pelanggan"
          maxLength={100}
          className="rounded-xl border border-charcoal/10 bg-offwhite px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="No. WhatsApp (opsional)"
          type="tel"
          className="rounded-xl border border-charcoal/10 bg-offwhite px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      </div>
      <p className="text-[11px] text-charcoal/40">
        Walk-in otomatis tercatat di jadwal jam sekarang, supaya kuota terapis ikut terhitung.
      </p>
    </div>
  );
}

// -------------------------------------------------
// Daftar layanan di keranjang
// -------------------------------------------------
function ItemsEditor({ items, setItems }) {
  const [picker, setPicker] = useState("");

  const update = (key, patch) => setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const add = (value) => {
    if (!value) return;
    setItems((prev) =>
      value === CUSTOM_OPTION
        ? [...prev, newItem("", 0)]
        : [...prev, newItem(value, parsePrice(findBookingOption(value)?.price))]
    );
    setPicker("");
  };

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-charcoal/40 py-3">Belum ada layanan. Tambahkan dari daftar di bawah.</p>
      ) : (
        <div className="space-y-2 mb-3">
          {items.map((item) => {
            const option = findBookingOption(item.serviceName);
            const isRange = option && /-/.test(option.price);
            return (
              <div key={item.key} className="rounded-xl border border-charcoal/10 p-3">
                <div className="flex items-start gap-2">
                  <input
                    value={item.serviceName}
                    onChange={(e) => update(item.key, { serviceName: e.target.value })}
                    placeholder="Nama layanan"
                    maxLength={150}
                    className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-charcoal focus:outline-none border-b border-transparent focus:border-gold/50"
                  />
                  <button
                    onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                    aria-label="Hapus layanan"
                    className="text-charcoal/30 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {isRange && <p className="text-[11px] text-gold-dark mt-0.5">Pricelist: {option.price}</p>}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <MoneyInput value={item.price} onChange={(v) => update(item.key, { price: v })} className="w-36" />
                  <div className="flex items-center gap-1.5">
                    <QtyButton icon={Minus} disabled={item.qty <= 1} onClick={() => update(item.key, { qty: item.qty - 1 })} />
                    <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                    <QtyButton icon={Plus} disabled={item.qty >= 20} onClick={() => update(item.key, { qty: item.qty + 1 })} />
                  </div>
                  <span className="text-sm font-semibold text-charcoal w-24 text-right">
                    {formatRupiah((Number(item.price) || 0) * item.qty)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Plus size={15} className="text-gold-dark shrink-0" />
        <select
          value={picker}
          onChange={(e) => add(e.target.value)}
          aria-label="Tambah layanan"
          className="flex-1 rounded-xl border border-charcoal/10 bg-offwhite px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          <option value="">Tambah layanan...</option>
          {BOOKING_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.name} value={o.name}>
                  {o.name} — {o.price}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM_OPTION}>+ Layanan / produk lain (isi manual)</option>
        </select>
      </div>
    </div>
  );
}

// -------------------------------------------------
// QRIS statis milik salon (gambar di-upload admin)
// -------------------------------------------------
function QrisPanel({ total }) {
  const [image, setImage] = useState(undefined); // undefined = memuat
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    settingsApi
      .getQris()
      .then(({ image }) => setImage(image))
      .catch((err) => {
        setImage(null);
        setError(err.message);
      });
  }, []);

  const upload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const dataUrl = await shrinkImage(file);
      const { image } = await settingsApi.saveQris(dataUrl);
      setImage(image);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="mt-4 text-center">
      {image === undefined ? (
        <p className="text-xs text-charcoal/40 py-6">Memuat QRIS...</p>
      ) : image ? (
        <>
          <img src={image} alt="QRIS Rosita Salon" className="mx-auto w-full max-w-[240px] rounded-xl border border-charcoal/10" />
          <p className="mt-2 text-sm">
            Minta customer scan & bayar <strong>{formatRupiah(total)}</strong>
          </p>
          <p className="text-[11px] text-charcoal/45">
            Pastikan notifikasi dana masuk sudah muncul di HP/EDC salon sebelum menekan tombol di bawah.
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-gold/40 bg-gold/5 px-4 py-6">
          <QrCode size={30} className="mx-auto text-gold/60" />
          <p className="mt-2 text-xs text-charcoal/55">Gambar QRIS salon belum di-upload.</p>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-dark hover:underline disabled:opacity-50"
      >
        <Upload size={13} />
        {uploading ? "Mengupload..." : image ? "Ganti gambar QRIS" : "Upload gambar QRIS"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Kecilkan gambar QRIS (maks 700px) supaya hemat database & cepat dimuat
function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      reject(new Error("File harus gambar PNG, JPG, atau WEBP."));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 700 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      let dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > 750_000) dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
    img.src = URL.createObjectURL(file);
  });
}

// -------------------------------------------------
// Komponen kecil
// -------------------------------------------------
function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-charcoal/5 shadow-soft p-4 md:p-5">
      {title && <h3 className="font-serif text-base font-semibold text-charcoal mb-3">{title}</h3>}
      {children}
    </div>
  );
}

function SourceTab({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-full transition-all ${
        active ? "bg-gold-gradient text-white shadow-gold" : "text-charcoal/60"
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

function MethodButton({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-all ${
        active ? "border-gold bg-gold/10 text-gold-dark ring-2 ring-gold/20" : "border-charcoal/10 text-charcoal/60 hover:border-gold/40"
      }`}
    >
      <Icon size={17} />
      {children}
    </button>
  );
}

function SumRow({ label, value, bold, danger }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-semibold text-base" : "text-sm"}`}>
      <span className="text-charcoal/60">{label}</span>
      <span className={danger ? "text-red-600" : "text-charcoal"}>{value}</span>
    </div>
  );
}

function MoneyInput({ value, onChange, className = "", placeholder }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-charcoal/40">Rp</span>
      <input
        inputMode="numeric"
        value={value === "" ? "" : Number(value || 0).toLocaleString("id-ID")}
        placeholder={placeholder}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange(digits === "" ? "" : String(Number(digits)));
        }}
        className="w-full rounded-xl border border-charcoal/10 bg-offwhite pl-9 pr-3 py-2 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
    </span>
  );
}

function QtyButton({ icon: Icon, ...props }) {
  return (
    <button
      type="button"
      className="w-7 h-7 rounded-full border border-charcoal/10 flex items-center justify-center text-charcoal/60 hover:border-gold/50 disabled:opacity-30"
      {...props}
    >
      <Icon size={13} />
    </button>
  );
}
