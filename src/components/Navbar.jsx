// =====================================================================
// src/components/Navbar.jsx
// =====================================================================
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, Calendar, LogIn, LogOut, LayoutDashboard, User } from "lucide-react";
import { SALON_INFO } from "../data/salonData";
import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { label: "Beranda", href: "#home" },
  { label: "Tentang Kami", href: "#about" },
  { label: "Layanan", href: "#services" },
  { label: "Promo", href: "#promo" },
  { label: "Galeri", href: "#gallery" },
  { label: "Testimoni", href: "#testimonials" },
  { label: "Kontak", href: "#contact" },
];

export default function Navbar({ onBookNow, onLoginClick, onDashboardClick }) {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleLinkClick = (href) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "glass shadow-soft py-3" : "bg-transparent py-5"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick("#home");
            }}
            className="flex items-center gap-2 group shrink-0"
          >
            <span className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold group-hover:rotate-12 transition-transform duration-300">
              <Sparkles size={18} className="text-white" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-serif text-xl md:text-2xl font-semibold tracking-wide text-charcoal">
                Rosita <span className="text-gradient-gold">Salon</span>
              </span>
              <span className="hidden xl:block whitespace-nowrap text-[10px] tracking-[0.2em] uppercase text-charcoal/50">
                {SALON_INFO.tagline}
              </span>
            </span>
          </a>

          {/* Desktop Menu */}
          <ul className="hidden lg:flex items-center gap-3.5 xl:gap-7">
            {NAV_LINKS.map((link) => (
              <li key={link.href} className="shrink-0">
                <a
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(link.href);
                  }}
                  className="relative whitespace-nowrap text-sm font-medium text-charcoal/80 hover:text-gold-dark transition-colors duration-300 after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-[1.5px] after:bg-gold-gradient hover:after:w-full after:transition-all after:duration-300"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop right side: auth + CTA */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0 whitespace-nowrap">
            {isAuthenticated ? (
              <>
                <button
                  onClick={onDashboardClick}
                  title={isAdmin ? "Dashboard Admin" : "Reservasi Saya"}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/80 hover:text-gold-dark px-3 py-2 rounded-full hover:bg-gold/10 transition-colors"
                >
                  {isAdmin ? <LayoutDashboard size={16} /> : <User size={16} />}
                  <span className="hidden xl:inline max-w-[110px] truncate">
                    {isAdmin ? "Dashboard Admin" : user?.name?.split(" ")[0]}
                  </span>
                </button>
                <button
                  onClick={logout}
                  aria-label="Keluar"
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-charcoal/10 text-charcoal/50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <button
                onClick={onLoginClick}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/80 hover:text-gold-dark px-3 py-2 rounded-full hover:bg-gold/10 transition-colors"
              >
                <LogIn size={16} />
                Masuk
              </button>
            )}
            <button
              onClick={onBookNow}
              className="inline-flex items-center gap-2 bg-gold-gradient text-white text-sm font-semibold px-4 xl:px-6 py-2.5 rounded-full shadow-gold hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
            >
              <Calendar size={16} />
              Book Appointment
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full border border-gold/30 text-charcoal hover:bg-gold/10 transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* Mobile Slide-in Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-charcoal/50 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed top-0 right-0 h-full w-[78%] max-w-sm bg-white z-50 lg:hidden shadow-2xl flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gold/15">
                <span className="font-serif text-lg font-semibold">
                  Rosita <span className="text-gradient-gold">Salon</span>
                </span>
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gold/10"
                >
                  <X size={20} />
                </button>
              </div>

              {isAuthenticated && (
                <div className="px-6 pt-5 pb-2">
                  <p className="text-xs text-charcoal/40">Masuk sebagai</p>
                  <p className="text-sm font-semibold text-charcoal">{user?.name}</p>
                  <p className="text-xs text-charcoal/45">{user?.email}</p>
                </div>
              )}

              <ul className="flex-1 flex flex-col px-6 py-4 gap-1 overflow-y-auto">
                {NAV_LINKS.map((link, i) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i + 0.1 }}
                  >
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(link.href);
                      }}
                      className="block py-3 text-base font-medium text-charcoal/80 border-b border-charcoal/5 hover:text-gold-dark hover:pl-2 transition-all duration-300"
                    >
                      {link.label}
                    </a>
                  </motion.li>
                ))}

                {isAuthenticated && (
                  <motion.li
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * NAV_LINKS.length + 0.1 }}
                  >
                    <button
                      onClick={() => {
                        setMobileOpen(false);
                        onDashboardClick();
                      }}
                      className="flex items-center gap-2 w-full text-left py-3 text-base font-medium text-charcoal/80 border-b border-charcoal/5 hover:text-gold-dark transition-all duration-300"
                    >
                      {isAdmin ? <LayoutDashboard size={17} /> : <User size={17} />}
                      {isAdmin ? "Dashboard Admin" : "Reservasi Saya"}
                    </button>
                  </motion.li>
                )}
              </ul>

              <div className="px-6 pb-8 pt-2 space-y-2">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onBookNow();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gold-gradient text-white font-semibold px-6 py-3 rounded-full shadow-gold"
                >
                  <Calendar size={16} />
                  Book Appointment
                </button>

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 border border-charcoal/15 text-charcoal/70 font-semibold px-6 py-3 rounded-full hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={16} />
                    Keluar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      onLoginClick();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 border border-charcoal/15 text-charcoal/70 font-semibold px-6 py-3 rounded-full hover:border-gold hover:text-gold-dark transition-colors"
                  >
                    <LogIn size={16} />
                    Masuk / Daftar
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
