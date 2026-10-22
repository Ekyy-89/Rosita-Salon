// =====================================================================
// src/components/Services.jsx
// =====================================================================
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Sparkles as SparkleIcon, Flower2, Hand, Tag } from "lucide-react";
import { services, CATEGORIES } from "../data/salonData";
import Reveal from "./Reveal";

const CATEGORY_ICON = {
  all: SparkleIcon,
  hair: Scissors,
  facial: Flower2,
  spa: SparkleIcon,
  nail: Hand,
};

export default function Services({ onOrder }) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredServices = useMemo(() => {
    if (activeTab === "all") return services;
    return services.filter((s) => s.category === activeTab);
  }, [activeTab]);

  return (
    <section id="services" className="relative py-20 md:py-28 bg-offwhite">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Reveal direction="pop">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark mb-3">
              Daftar Layanan
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-charcoal">
              Pilih Perawatan Favoritmu
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 text-charcoal/55 leading-relaxed">
              Dari perawatan rambut, wajah, spa, hingga nail art — semua
              tersedia dengan harga transparan dan hasil yang memuaskan.
            </p>
          </Reveal>
        </div>

        {/* Filter tabs */}
        <Reveal delay={0.1} className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICON[cat.key];
            const isActive = activeTab === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border transition-all duration-300 ${
                  isActive
                    ? "bg-gold-gradient text-white border-transparent shadow-gold"
                    : "bg-white text-charcoal/70 border-charcoal/10 hover:border-gold/40 hover:text-gold-dark"
                }`}
              >
                <Icon size={16} />
                {cat.label}
              </button>
            );
          })}
        </Reveal>

        {/* Grid */}
        <motion.div
          layout
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredServices.map((service, i) => (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                whileHover={{ y: -6 }}
                className="group relative bg-white rounded-2xl p-6 border border-charcoal/5 hover:border-gold/30 hover:shadow-gold transition-all duration-300 flex flex-col"
              >
                {service.popular && (
                  <span className="absolute -top-3 right-5 bg-gold-gradient text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full shadow-gold">
                    Favorit
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg font-semibold text-charcoal leading-snug">
                    {service.name}
                  </h3>
                </div>

                <p className="mt-2 text-sm text-charcoal/55 leading-relaxed flex-1">
                  {service.description}
                </p>

                {service.note && (
                  <p className="mt-2 text-xs italic text-gold-dark/80">
                    * {service.note}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between pt-4 border-t border-dashed border-charcoal/10">
                  <span className="inline-flex items-center gap-1.5 font-serif text-lg font-semibold text-gold-dark">
                    <Tag size={15} />
                    {service.price}
                  </span>
                  <button
                    onClick={() => onOrder(service)}
                    className="text-xs font-semibold px-4 py-2 rounded-full bg-charcoal text-white hover:bg-gold-gradient transition-all duration-300"
                  >
                    Pesan Layanan
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
