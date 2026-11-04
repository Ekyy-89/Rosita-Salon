// =====================================================================
// src/App.jsx
// =====================================================================
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AIBookingAssistant from "./components/AIBookingAssistant";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import Promo from "./components/Promo";
import Gallery from "./components/Gallery";
import Testimonials from "./components/Testimonials";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import BookingModal from "./components/BookingModal";
import AuthModal from "./components/Auth/AuthModal";
import ReservationDashboard from "./components/Dashboard/ReservationDashboard";
import { promoServiceName } from "./data/salonData";

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  // Halaman disimpan di URL (#dashboard) supaya tetap di dashboard saat browser
  // di-refresh, dan tombol Back browser bisa dipakai untuk kembali ke website.
  const [page, setPage] = useState(() => (window.location.hash === "#dashboard" ? "dashboard" : "site"));
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  // Naik setiap reservasi baru dibuat, supaya dashboard memuat ulang datanya
  const [reservationVersion, setReservationVersion] = useState(0);

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === "#dashboard" ? "dashboard" : "site");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  // Data awal form booking: { serviceName?, date?, time? }
  const [bookingPrefill, setBookingPrefill] = useState(null);

  // Token dari link email "Lupa Password" (#reset-password=...). Langsung dihapus
  // dari address bar supaya tidak tersimpan di riwayat browser / ikut ter-share.
  const [resetToken, setResetToken] = useState(
    () => window.location.hash.match(/^#reset-password=([a-f0-9]{64})$/)?.[1] ?? null
  );
  const [isAuthOpen, setIsAuthOpen] = useState(Boolean(resetToken));

  useEffect(() => {
    if (window.location.hash.startsWith("#reset-password=")) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);
  const [authMessage, setAuthMessage] = useState("");
  // Menyimpan aksi booking yang tertunda sampai user berhasil login
  const [pendingBooking, setPendingBooking] = useState(null); // null | prefill object

  // Cek status login sebelum membuka modal booking; kalau belum login,
  // buka modal Auth dulu dan ingat aksi booking yang tadi diminta.
  const requireAuthThen = (prefill) => {
    if (isAuthenticated) {
      setBookingPrefill(prefill);
      setIsBookingOpen(true);
    } else {
      setPendingBooking(prefill);
      setAuthMessage("Silakan masuk atau daftar akun dulu untuk membuat reservasi.");
      setIsAuthOpen(true);
    }
  };

  // Tombol "Book Appointment" umum (Navbar, Hero, dll)
  const openBookingModal = () => requireAuthThen({});

  // Tombol "Pesan Layanan" pada kartu layanan tertentu
  const openBookingModalWithService = (service) => requireAuthThen({ serviceName: service.name });

  // Tombol "Ambil Promo" -> paket promo langsung terpilih
  const openBookingModalWithPromo = (promo) =>
    requireAuthThen({ serviceName: promoServiceName(promo) });

  // Slot yang dipilih dari AI Assistant
  const openBookingModalFromAI = (prefill) => requireAuthThen(prefill);

  const handleAuthSuccess = () => {
    setResetToken(null);
    setIsAuthOpen(false);
    setAuthMessage("");
    if (pendingBooking) {
      setBookingPrefill(pendingBooking);
      setIsBookingOpen(true);
      setPendingBooking(null);
    }
  };

  const openLoginModal = () => {
    setAuthMessage("");
    setPendingBooking(null);
    setIsAuthOpen(true);
  };

  const openDashboard = () => {
    setIsBookingOpen(false);
    if (window.location.hash !== "#dashboard") window.location.hash = "dashboard";
    setPage("dashboard");
    window.scrollTo({ top: 0 });
  };
  const backToSite = () => {
    history.pushState(null, "", window.location.pathname + window.location.search);
    setPage("site");
  };

  const bookingModal = (
    <BookingModal
      isOpen={isBookingOpen}
      onClose={() => setIsBookingOpen(false)}
      prefill={bookingPrefill}
      onViewReservations={openDashboard}
      onCreated={() => setReservationVersion((v) => v + 1)}
    />
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-offwhite">
        <p className="text-sm text-charcoal/40">Memuat...</p>
      </div>
    );
  }

  if (page === "dashboard" && isAuthenticated) {
    return (
      <>
        <ReservationDashboard
          onBack={backToSite}
          onBookNow={openBookingModal}
          refreshKey={reservationVersion}
        />
        {bookingModal}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-offwhite text-charcoal overflow-x-hidden">
      <Navbar
        onBookNow={openBookingModal}
        onLoginClick={openLoginModal}
        onDashboardClick={openDashboard}
      />

      <main>
        <Hero onBookNow={openBookingModal} />
        <About />
        <Services onOrder={openBookingModalWithService} />
        <Promo onBookPromo={openBookingModalWithPromo} />
        <Gallery />
        <Testimonials onRequireLogin={openLoginModal} />
        <Contact />
      </main>

      <Footer />

      {bookingModal}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setPendingBooking(null);
          setAuthMessage("");
          setResetToken(null);
        }}
        onSuccess={handleAuthSuccess}
        message={authMessage}
        resetToken={resetToken}
      />

      <AIBookingAssistant onPickSlot={openBookingModalFromAI} onRequireLogin={openLoginModal} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
