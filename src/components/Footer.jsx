// =====================================================================
// src/components/Footer.jsx
// =====================================================================
import { ArrowUp } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  const scrollTo = (href) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <footer className="relative bg-offwhite text-charcoal/60 py-6 border-t border-charcoal/5">
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-charcoal/45 text-center sm:text-left">
          © {year} Rosita Salon. Semua hak cipta dilindungi.
        </p>
        <button
          onClick={() => scrollTo("#home")}
          aria-label="Kembali ke atas"
          className="w-10 h-10 rounded-full bg-white shadow-soft hover:bg-gold-gradient hover:text-white flex items-center justify-center transition-all duration-300"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </footer>
  );
}