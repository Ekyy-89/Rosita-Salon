// =====================================================================
// src/components/Contact.jsx
// =====================================================================
import { Phone, Instagram, MapPin, Clock, MessageCircle } from "lucide-react";
import { SALON_INFO } from "../data/salonData";
import Reveal from "./Reveal";

const CONTACT_ITEMS = [
  {
    icon: Phone,
    label: "Telepon / WhatsApp",
    value: SALON_INFO.phone,
    href: `https://wa.me/${SALON_INFO.whatsapp}`,
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: `@${SALON_INFO.instagram}`,
    href: `https://instagram.com/${SALON_INFO.instagram}`,
  },
  {
    icon: MapPin,
    label: "Lokasi",
    value: SALON_INFO.address,
    href: SALON_INFO.mapsUrl,
  },
  {
    icon: Clock,
    label: "Jam Operasional",
    value: SALON_INFO.openHours,
    href: null,
  },
];

export default function Contact() {
  return (
    <section id="contact" className="relative py-20 md:py-28 bg-offwhite">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-stretch">
          {/* Left: info */}
          <div>
            <Reveal>
              <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-gold-dark mb-3">
                Hubungi Kami
              </span>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-serif text-3xl md:text-4xl font-semibold text-charcoal">
                Mari Terhubung dengan
                <br /> Rosita Salon
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-5 text-charcoal/60 leading-relaxed max-w-md">
                Punya pertanyaan seputar layanan atau ingin booking langsung?
                Tim kami siap membantu lewat WhatsApp maupun media sosial.
              </p>
            </Reveal>

            <div className="mt-9 grid sm:grid-cols-2 gap-4">
              {CONTACT_ITEMS.map((item, i) => {
                const Icon = item.icon;
                const content = (
                  <div className="h-full flex items-start gap-3 p-5 rounded-2xl bg-white border border-charcoal/5 hover:border-gold/30 hover:shadow-soft transition-all duration-300">
                    <span className="shrink-0 w-11 h-11 rounded-xl bg-gold/10 flex items-center justify-center text-gold-dark">
                      <Icon size={19} />
                    </span>
                    <div>
                      <p className="text-xs text-charcoal/45">{item.label}</p>
                      <p className="text-sm font-semibold text-charcoal mt-0.5 break-words">
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
                return (
                  <Reveal key={item.label} delay={0.1 * i} direction="up">
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-full"
                      >
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </Reveal>
                );
              })}
            </div>
          </div>

          {/* Right: map + CTA card */}
          <Reveal direction="right" delay={0.15}>
            <div className="relative h-full min-h-[380px] rounded-3xl overflow-hidden shadow-soft border border-charcoal/5">
              <iframe
                title="Lokasi Rosita Salon"
                src={SALON_INFO.mapsEmbedUrl}
                className="absolute inset-0 w-full h-full grayscale-[20%]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="absolute bottom-5 left-5 right-5 glass rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-charcoal">
                    Chat langsung via WhatsApp
                  </p>
                  <p className="text-xs text-charcoal/50 mt-0.5">
                    Respon cepat setiap hari
                  </p>
                </div>
                <a
                  href={`https://wa.me/${SALON_INFO.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-11 h-11 rounded-full bg-gold-gradient flex items-center justify-center text-white shadow-gold"
                  aria-label="Chat WhatsApp"
                >
                  <MessageCircle size={19} />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
