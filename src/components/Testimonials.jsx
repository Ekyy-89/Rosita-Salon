// =====================================================================
// src/components/Testimonials.jsx
// Slider testimoni + form komentar di bawahnya.
// Testimoni diambil dari database (butuh backend jalan). Menulis
// komentar wajib login, memakai akun yang sama dengan reservasi.
// =====================================================================
import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight, Send, LogIn } from "lucide-react";
import { testimonialApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Reveal from "./Reveal";

export default function Testimonials({ onRequireLogin }) {
  const { isAuthenticated, user } = useAuth();

  const [testimonials, setTestimonials] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  const scrollRef = useRef(null);
  const cardRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadTestimonials = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { testimonials } = await testimonialApi.list();
      setTestimonials(testimonials);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTestimonials();
  }, [loadTestimonials]);

  const scrollToIndex = (index) => {
    const card = cardRefs.current[index];
    if (card && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: card.offsetLeft - scrollRef.current.offsetLeft,
        behavior: "smooth",
      });
    }
  };

  const handlePrev = () => scrollToIndex(Math.max(activeIndex - 1, 0));
  const handleNext = () => scrollToIndex(Math.min(activeIndex + 1, testimonials.length - 1));

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft } = scrollRef.current;
    let closestIndex = 0;
    let closestDistance = Infinity;

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const distance = Math.abs(card.offsetLeft - scrollRef.current.offsetLeft - scrollLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, testimonials.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (rating === 0) {
      setFormError("Pilih rating bintang dulu ya.");
      return;
    }
    if (!message.trim()) {
      setFormError("Tulis komentar kamu dulu ya.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { testimonial } = await testimonialApi.create({ rating, message });
      setTestimonials((prev) => [testimonial, ...prev]);
      setRating(0);
      setMessage("");
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 2500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showControls = testimonials.length > 1;

  return (
    <section id="testimonials" className="relative py-20 md:py-28 bg-offwhite overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Reveal direction="pop">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark mb-3">
              Testimoni
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-charcoal">
              Apa Kata Mereka
            </h2>
          </Reveal>
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-charcoal/40 py-10">Memuat testimoni...</p>
        ) : loadError ? (
          <p className="text-center text-sm text-red-500 py-10">{loadError}</p>
        ) : testimonials.length === 0 ? (
          <p className="text-center text-sm text-charcoal/45 py-10">
            Belum ada testimoni. Jadilah yang pertama menulis komentar di bawah ini!
          </p>
        ) : (
          <>
            <div className="relative">
              <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 -mx-5 px-5 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {testimonials.map((t, i) => (
                  <div
                    key={t.id}
                    ref={(el) => (cardRefs.current[i] = el)}
                    className="snap-center shrink-0 w-[85%] sm:w-[60%] lg:w-[calc(33.333%-1rem)]"
                  >
                    <motion.div
                      whileHover={{ y: -6 }}
                      className="relative h-full bg-white rounded-2xl p-7 shadow-soft border border-charcoal/5"
                    >
                      <Quote className="absolute top-6 right-6 text-gold/15" size={40} />
                      <div className="flex text-gold mb-4">
                        {Array.from({ length: t.rating }).map((_, idx) => (
                          <Star key={idx} size={15} fill="currentColor" strokeWidth={0} />
                        ))}
                      </div>
                      <p className="text-sm text-charcoal/65 leading-relaxed relative z-10">
                        "{t.message}"
                      </p>
                      <div className="mt-6 flex items-center gap-3 pt-5 border-t border-charcoal/5">
                        <span className="w-11 h-11 rounded-full bg-gold-gradient flex items-center justify-center text-white font-serif font-semibold">
                          {t.user_name?.charAt(0)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-charcoal">{t.user_name}</p>
                          <p className="text-xs text-charcoal/45">{formatDate(t.created_at)}</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>

              {showControls && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={activeIndex === 0}
                    aria-label="Testimoni sebelumnya"
                    className="hidden md:flex absolute top-1/2 -left-5 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-soft border border-charcoal/5 items-center justify-center text-charcoal/60 hover:text-gold-dark hover:border-gold/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={activeIndex === testimonials.length - 1}
                    aria-label="Testimoni berikutnya"
                    className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-soft border border-charcoal/5 items-center justify-center text-charcoal/60 hover:text-gold-dark hover:border-gold/30 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {showControls && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {testimonials.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => scrollToIndex(i)}
                    aria-label={`Ke testimoni ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === activeIndex ? "w-6 bg-gold-gradient" : "w-2 bg-charcoal/15 hover:bg-charcoal/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}

        <div className="max-w-xl mx-auto mt-16 bg-white rounded-2xl border border-charcoal/5 shadow-soft p-7">
          <h3 className="font-serif text-lg font-semibold text-charcoal text-center">
            Tulis Testimoni Kamu
          </h3>

          {!isAuthenticated ? (
            <div className="mt-5 text-center">
              <p className="text-sm text-charcoal/55">
                Masuk atau daftar dulu untuk menulis testimoni.
              </p>
              <button
                onClick={onRequireLogin}
                className="mt-4 inline-flex items-center gap-2 bg-gold-gradient text-white text-sm font-semibold px-6 py-2.5 rounded-full shadow-gold hover:shadow-lg transition-all duration-300"
              >
                <LogIn size={16} />
                Masuk / Daftar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <p className="text-xs text-charcoal/45 text-center -mt-1">
                Menulis sebagai <strong>{user?.name}</strong>
              </p>

              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`Beri rating ${star} bintang`}
                    className="p-1"
                  >
                    <Star
                      size={26}
                      className={
                        star <= (hoverRating || rating) ? "text-gold" : "text-charcoal/15"
                      }
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Ceritakan pengalaman kamu di Rosita Salon..."
                className="w-full rounded-xl border border-charcoal/10 bg-offwhite px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
              />

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {formError}
                </p>
              )}

              <AnimatePresence>
                {formSuccess && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5"
                  >
                    Terima kasih! Testimoni kamu berhasil ditambahkan.
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-gold-gradient text-white font-semibold px-6 py-3 rounded-full shadow-gold hover:shadow-lg transition-all duration-300 disabled:opacity-60"
              >
                <Send size={16} />
                {isSubmitting ? "Mengirim..." : "Kirim Testimoni"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}