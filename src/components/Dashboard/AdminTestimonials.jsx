// =====================================================================
// src/components/Dashboard/AdminTestimonials.jsx
// Moderasi testimoni: admin bisa menghapus testimoni spam / tidak pantas.
// =====================================================================
import { useCallback, useEffect, useState } from "react";
import { Star, Trash2, MessageSquareQuote } from "lucide-react";
import { testimonialApi } from "../../api/client";
import { formatDate } from "./dashboardUtils";

export default function AdminTestimonials({ onError }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { testimonials } = await testimonialApi.list();
      setItems(testimonials);
    } catch (err) {
      onError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (t) => {
    if (!window.confirm(`Hapus testimoni dari ${t.user_name}? Testimoni akan hilang dari website.`)) return;
    setDeletingId(t.id);
    try {
      await testimonialApi.remove(t.id);
      setItems((prev) => prev.filter((x) => x.id !== t.id));
    } catch (err) {
      onError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const average = items.length ? (items.reduce((sum, t) => sum + t.rating, 0) / items.length).toFixed(1) : "-";

  if (isLoading) {
    return <div className="h-40 bg-white rounded-2xl border border-charcoal/5 animate-pulse" />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mb-5 text-sm text-charcoal/60">
        <span>
          <strong className="text-charcoal">{items.length}</strong> testimoni tampil di website
        </span>
        <span className="inline-flex items-center gap-1">
          Rata-rata <Star size={14} className="text-gold" fill="currentColor" strokeWidth={0} />
          <strong className="text-charcoal">{average}</strong>
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-charcoal/10">
          <MessageSquareQuote size={30} className="mx-auto text-gold/60" />
          <p className="mt-3 text-sm text-charcoal/55">Belum ada testimoni.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map((t) => (
            <div
              key={t.id}
              className={`bg-white rounded-2xl border p-4 shadow-soft flex flex-col ${
                t.rating <= 2 ? "border-amber-200" : "border-charcoal/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-charcoal">{t.user_name}</p>
                  <p className="text-xs text-charcoal/40">{formatDate(t.created_at?.slice(0, 10))}</p>
                </div>
                <div className="flex text-gold" aria-label={`Rating ${t.rating} dari 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill="currentColor"
                      strokeWidth={0}
                      className={i < t.rating ? "" : "text-charcoal/10"}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2.5 text-sm text-charcoal/65 leading-relaxed flex-1 break-words">"{t.message}"</p>
              <div className="mt-3 pt-3 border-t border-dashed border-charcoal/10 flex justify-end">
                <button
                  onClick={() => remove(t)}
                  disabled={deletingId === t.id}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 disabled:opacity-40"
                >
                  <Trash2 size={13} />
                  {deletingId === t.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
