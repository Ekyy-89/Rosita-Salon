// =====================================================================
// src/components/Gallery.jsx
// =====================================================================
import { motion } from "framer-motion";
import { Expand } from "lucide-react";
import { gallery } from "../data/salonData";
import Reveal from "./Reveal";

export default function Gallery() {
  return (
    <section id="gallery" className="relative py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <Reveal direction="pop">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark mb-3">
              Galeri
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-charcoal">
              Momen di Rosita Salon
            </h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {gallery.map((item, i) => (
            <Reveal
              key={item.id}
              delay={(i % 3) * 0.1}
              direction="pop"
              className={i === 0 ? "col-span-2 row-span-2" : ""}
            >
              <motion.div
                whileHover="hover"
                className={`group relative overflow-hidden rounded-2xl cursor-pointer ${
                  i === 0 ? "h-full min-h-[280px] md:min-h-[400px]" : "h-40 md:h-48"
                }`}
              >
                <motion.img
                  src={item.image}
                  alt={item.alt}
                  variants={{ hover: { scale: 1.1 } }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover"
                />
                <motion.div
                  variants={{ hover: { opacity: 1 } }}
                  initial={{ opacity: 0 }}
                  className="absolute inset-0 bg-charcoal/50 flex items-center justify-center"
                >
                  <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-charcoal">
                    <Expand size={18} />
                  </span>
                </motion.div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
