// =====================================================================
// src/components/Auth/AuthModal.jsx
// Modal gabungan Login & Daftar (Register) untuk customer maupun admin.
// Admin login pakai akun yang dibuat lewat "npm run seed:admin" di backend.
// Customer bebas daftar pakai email pribadi mereka.
// =====================================================================
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Mail, Lock, User, Phone, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", damping: 24, stiffness: 260 },
  },
  exit: { opacity: 0, y: 40, scale: 0.95, transition: { duration: 0.2 } },
};

const initialLogin = { email: "", password: "" };
const initialRegister = { name: "", email: "", phone: "", password: "", confirmPassword: "" };

/**
 * AuthModal
 * Props:
 * - isOpen, onClose
 * - onSuccess(user): dipanggil setelah login/register berhasil
 * - message: teks opsional yang ditampilkan di atas form (mis. alasan kenapa harus login)
 */
export default function AuthModal({ isOpen, onClose, onSuccess, message }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode("login");
      setLoginForm(initialLogin);
      setRegisterForm(initialRegister);
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleLoginChange = (e) => {
    setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegisterChange = (e) => {
    setRegisterForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const user = await login(loginForm);
      onSuccess?.(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (registerForm.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await register(registerForm);
      onSuccess?.(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
        >
          <motion.div className="absolute inset-0 bg-charcoal/60 backdrop-blur-md" onClick={onClose} />

          <motion.div
            variants={modalVariants}
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gold/15"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 bg-white/95 backdrop-blur border-b border-charcoal/5 rounded-t-3xl">
              <h3 className="font-serif text-xl font-semibold text-charcoal">
                {mode === "login" ? "Masuk ke Akun" : "Daftar Akun Baru"}
              </h3>
              <button
                onClick={onClose}
                aria-label="Tutup modal"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gold/10 text-charcoal/60 hover:text-gold-dark transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-6">
              {message && (
                <div className="mb-5 flex items-start gap-2.5 bg-gold/10 border border-gold/25 text-gold-dark text-sm rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{message}</span>
                </div>
              )}

              {/* Tab switch */}
              <div className="flex bg-offwhite rounded-full p-1 mb-6">
                <button
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-full transition-all duration-300 ${
                    mode === "login" ? "bg-gold-gradient text-white shadow-gold" : "text-charcoal/60"
                  }`}
                >
                  <LogIn size={15} />
                  Masuk
                </button>
                <button
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-full transition-all duration-300 ${
                    mode === "register" ? "bg-gold-gradient text-white shadow-gold" : "text-charcoal/60"
                  }`}
                >
                  <UserPlus size={15} />
                  Daftar
                </button>
              </div>

              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleLoginSubmit}
                    className="space-y-4"
                  >
                    <InputField
                      icon={Mail}
                      label="Email"
                      name="email"
                      type="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      placeholder="nama@email.com"
                      required
                    />
                    <InputField
                      icon={Lock}
                      label="Password"
                      name="password"
                      type="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      placeholder="Masukkan password"
                      required
                    />
                    <SubmitButton isSubmitting={isSubmitting} label="Masuk" />
                    <p className="text-xs text-center text-charcoal/45">
                      Belum punya akun?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("register")}
                        className="text-gold-dark font-semibold hover:underline"
                      >
                        Daftar di sini
                      </button>
                    </p>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleRegisterSubmit}
                    className="space-y-4"
                  >
                    <InputField
                      icon={User}
                      label="Nama Lengkap"
                      name="name"
                      value={registerForm.name}
                      onChange={handleRegisterChange}
                      placeholder="Nama kamu"
                      required
                    />
                    <InputField
                      icon={Mail}
                      label="Email"
                      name="email"
                      type="email"
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      placeholder="Bebas pakai email pribadi kamu"
                      required
                    />
                    <InputField
                      icon={Phone}
                      label="Nomor WhatsApp (opsional)"
                      name="phone"
                      type="tel"
                      value={registerForm.phone}
                      onChange={handleRegisterChange}
                      placeholder="0812xxxxxxx"
                    />
                    <InputField
                      icon={Lock}
                      label="Password"
                      name="password"
                      type="password"
                      value={registerForm.password}
                      onChange={handleRegisterChange}
                      placeholder="Minimal 8 karakter"
                      required
                    />
                    <InputField
                      icon={Lock}
                      label="Konfirmasi Password"
                      name="confirmPassword"
                      type="password"
                      value={registerForm.confirmPassword}
                      onChange={handleRegisterChange}
                      placeholder="Ulangi password"
                      required
                    />
                    <SubmitButton isSubmitting={isSubmitting} label="Daftar Sekarang" />
                    <p className="text-xs text-center text-charcoal/45">
                      Sudah punya akun?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="text-gold-dark font-semibold hover:underline"
                      >
                        Masuk di sini
                      </button>
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function InputField({ icon: Icon, label, name, value, onChange, type = "text", placeholder, required }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-xs font-semibold text-charcoal/70 mb-1.5">
        <Icon size={14} className="text-gold-dark" />
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-charcoal/10 bg-offwhite px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
      />
    </label>
  );
}

function SubmitButton({ isSubmitting, label }) {
  return (
    <motion.button
      whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
      whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
      type="submit"
      disabled={isSubmitting}
      className="w-full inline-flex items-center justify-center gap-2 bg-gold-gradient text-white font-semibold px-6 py-3.5 rounded-full shadow-gold hover:shadow-lg transition-all duration-300 mt-2 disabled:opacity-60"
    >
      {isSubmitting ? "Memproses..." : label}
    </motion.button>
  );
}
