// =====================================================================
// src/components/About.jsx
// =====================================================================
import { ShieldCheck, Sparkles, Award } from "lucide-react";
import Reveal from "./Reveal";

const HIGHLIGHTS = [
  {
    icon: Award,
    title: "Terapis Bersertifikat",
    description:
      "Tim terapis kami terlatih dan berpengalaman, memastikan setiap treatment dikerjakan dengan teknik yang tepat dan aman.",
  },
  {
    icon: Sparkles,
    title: "Produk Premium",
    description:
      "Kami hanya menggunakan produk berkualitas seperti Makarizo dan formula pilihan lain untuk hasil maksimal dan tahan lama.",
  },
  {
    icon: ShieldCheck,
    title: "Hygiene Guarantee",
    description:
      "Kebersihan alat dan ruangan menjadi prioritas utama, sehingga kamu bisa merasa nyaman dan tenang selama perawatan.",
  },
];

export default function About() {
  return (
    <section id="about" className="relative py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Image collage */}
          <Reveal direction="left" className="relative order-2 lg:order-1">
            <div className="relative max-w-md mx-auto">
              <img
                src="https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?q=80&w=700&auto=format&fit=crop"
                alt="Suasana perawatan di Rosita Salon"
                className="w-full h-80 object-cover rounded-3xl shadow-soft"
              />
              <img
                src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?q=80&w=500&auto=format&fit=crop"
                alt="Detail perawatan rambut"
                className="hidden sm:block w-44 h-56 object-cover rounded-2xl shadow-xl border-4 border-white absolute -bottom-10 -right-6"
              />
              <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-gold-gradient opacity-20 blur-2xl" />
            </div>
          </Reveal>

          {/* Text content */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark mb-3">
                Tentang Rosita Salon
              </span>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold text-charcoal leading-tight">
                Kecantikan yang Terasa,
                <br /> Kepercayaan yang Terjaga
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 text-charcoal/60 leading-relaxed max-w-xl">
                Sejak awal berdiri, Rosita Salon berkomitmen menghadirkan
                pengalaman perawatan yang tak hanya membuat kamu tampil
                cantik, tapi juga merasa nyaman dan dihargai — mulai dari
                perawatan rambut, wajah, hingga nail art.
              </p>
            </Reveal>

            <div className="mt-10 grid sm:grid-cols-1 gap-5">
              {HIGHLIGHTS.map(({ icon: Icon, title, description }, i) => (
                <Reveal key={title} delay={0.15 * i} direction="right">
                  <div className="group flex gap-4 p-5 rounded-2xl border border-charcoal/5 hover:border-gold/30 hover:shadow-soft transition-all duration-300">
                    <span className="shrink-0 w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold-dark group-hover:bg-gold-gradient group-hover:text-white transition-all duration-300">
                      <Icon size={22} />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-charcoal">
                        {title}
                      </h3>
                      <p className="text-sm text-charcoal/55 mt-1 leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
