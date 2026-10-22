// =====================================================================
// src/components/Promo.jsx
// =====================================================================
import { motion } from "framer-motion";
import { BadgePercent, ArrowRight } from "lucide-react";
import { promos } from "../data/salonData";
import Reveal from "./Reveal";

export default function Promo({ onBookPromo }) {
  return (
    <section
      id="promo"
      className="relative py-20 md:py-28 bg-charcoal overflow-hidden"
    >
      {/* Decorative gold rings */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-72 h-72 rounded-full border border-gold/20" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-56 h-56 rounded-full border border-gold/10" />

      <div className="relative max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Reveal direction="pop">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase text-gold mb-3">
              <BadgePercent size={14} />
              Promo Spesial
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-white">
              Penawaran Terbatas untukmu
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 text-white/50 leading-relaxed">
              Nikmati paket perawatan pilihan dengan harga spesial. Jangan
              sampai terlewat, kuota terbatas setiap minggunya.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {promos.map((promo, i) => (
            <Reveal key={promo.id} delay={i * 0.12} direction="up">
               <motion.div
                whileHover={{ y: -8 }}
                className="relative h-full bg-white border border-gold/20 rounded-2xl p-7 flex flex-col shadow-soft"
              >
                <span className="self-start text-[10px] font-bold uppercase tracking-wider bg-gold-gradient text-charcoal px-3 py-1 rounded-full mb-5">
                  {promo.badge}
                </span>
                <h3 className="font-serif text-xl font-semibold text-charcoal">
                  {promo.title}
                </h3>
                <p className="text-sm text-charcoal/60 mt-2 leading-relaxed flex-1">
                  {promo.description}
                </p>

                <div className="mt-6 flex items-end gap-3">
                  <span className="text-sm text-charcoal/40 line-through">
                    {promo.originalPrice}
                  </span>
                  <span className="font-serif text-2xl font-semibold text-gold-dark">
                    {promo.discountPrice}
                  </span>
                </div>

                <button
                  onClick={() => onBookPromo(promo)}
                  className="mt-6 inline-flex items-center justify-center gap-2 border border-gold/40 text-gold font-semibold px-5 py-2.5 rounded-full hover:bg-gold-gradient hover:text-charcoal hover:border-transparent transition-all duration-300"
                >
                  Ambil Promo
                  <ArrowRight size={15} />
                </button>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
