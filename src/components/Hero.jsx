// =====================================================================
// src/components/Hero.jsx
// =====================================================================
import { motion } from "framer-motion";
import { Star, Users, ArrowRight, PlayCircle } from "lucide-react";
import Reveal from "./Reveal";

const STATS = [
  { icon: Star, value: "4.9/5", label: "Rating Pelanggan" },
  { icon: Users, value: "2.500+", label: "Klien Puas" },
];

export default function Hero({ onBookNow }) {
  const scrollToServices = () => {
    document.querySelector("#services")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative overflow-hidden pt-32 pb-20 md:pt-44 md:pb-28 bg-offwhite"
    >
      {/* Decorative floating blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold/10 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-0 -left-24 w-72 h-72 rounded-full bg-gold-dark/10 blur-3xl animate-float [animation-delay:2s]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[radial-gradient(circle_at_1px_1px,#1A1A1A_1px,transparent_0)] [background-size:28px_28px]" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8 grid lg:grid-cols-2 gap-14 items-center">
        {/* Left: Text content */}
        <div className="text-center lg:text-left">
          <Reveal direction="down">
            <span className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide text-gold-dark uppercase mb-6">
              ✦ Salon Kecantikan Terpercaya
            </span>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.1] text-charcoal">
              Rawat Diri, <br className="hidden sm:block" />
              <span className="text-gradient-gold italic">Rasakan</span> Pesonanya
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mt-6 text-charcoal/60 text-base md:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Rosita Salon menghadirkan perawatan rambut, wajah, dan nail art
              dengan sentuhan personal, produk pilihan, dan suasana yang
              menenangkan — karena kamu pantas merasa cantik setiap hari.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={onBookNow}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gold-gradient text-white font-semibold px-8 py-3.5 rounded-full shadow-gold hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                Book Appointment
                <ArrowRight size={18} />
              </button>
              <button
                onClick={scrollToServices}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-charcoal/15 text-charcoal font-semibold px-8 py-3.5 rounded-full hover:border-gold hover:text-gold-dark transition-all duration-300"
              >
                <PlayCircle size={18} />
                Lihat Layanan
              </button>
            </div>
          </Reveal>

          {/* Stats */}
          <Reveal delay={0.4}>
            <div className="mt-12 flex items-center justify-center lg:justify-start gap-8">
              {STATS.map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-white shadow-soft flex items-center justify-center text-gold-dark">
                    <Icon size={20} fill={label.includes("Rating") ? "currentColor" : "none"} />
                  </span>
                  <div className="text-left">
                    <p className="font-serif text-lg font-semibold text-charcoal leading-none">
                      {value}
                    </p>
                    <p className="text-xs text-charcoal/50 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right: Visual */}
        <Reveal direction="right" delay={0.2} className="relative">
          <div className="relative mx-auto max-w-md">
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white"
            >
              <img
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=900&auto=format&fit=crop"
                alt="Perawatan kecantikan di Rosita Salon"
                className="w-full h-[420px] md:h-[480px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 via-transparent to-transparent" />
            </motion.div>

            {/* Floating glass card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="absolute -bottom-6 -left-6 md:-left-10 glass rounded-2xl px-5 py-4 shadow-gold flex items-center gap-3"
            >
              <span className="flex text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              <div>
                <p className="text-sm font-semibold text-charcoal">Dipercaya 2.500+ klien</p>
                <p className="text-xs text-charcoal/50">Sejak dulu, konsisten mempercantik</p>
              </div>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
