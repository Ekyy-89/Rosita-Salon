// =====================================================================
// src/components/Auth/AuthModal.jsx
// Modal gabungan Login & Daftar (Register) untuk customer maupun admin.
// Admin login pakai akun yang dibuat lewat "npm run seed:admin" di backend.
// Customer bebas daftar pakai email pribadi mereka.
// =====================================================================
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api/client";

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
const initialReset = { password: "", confirmPassword: "" };

const TITLES = {
  login: "Masuk ke Akun",
  register: "Daftar Akun Baru",
  forgot: "Lupa Password",
  reset: "Buat Password Baru",
};

/**
 * AuthModal
 * Props:
 * - isOpen, onClose
 * - onSuccess(user): dipanggil setelah login/register berhasil
 * - message: teks opsional yang ditampilkan di atas form (mis. alasan kenapa harus login)
 * - resetToken: token dari link email "Lupa Password"; kalau ada, modal langsung
 *   membuka form "Buat Password Baru"
 */
export default function AuthModal({ isOpen, onClose, onSuccess, message, resetToken }) {
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState(resetToken ? "reset" : "login"); // "login" | "register" | "forgot" | "reset"
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetForm, setResetForm] = useState(initialReset);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(resetToken ? "reset" : "login");
      setLoginForm(initialLogin);
      setRegisterForm(initialRegister);
      setForgotEmail("");
      setResetForm(initialReset);
      setError("");
      setInfo("");
    }
  }, [isOpen, resetToken]);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
  };

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

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setIsSubmitting(true);
    try {
      const { message: sent } = await authApi.forgotPassword(forgotEmail.trim());
      setInfo(sent);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (resetForm.password !== resetForm.confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (resetForm.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await resetPassword({ token: resetToken, password: resetForm.password });
      onSuccess?.(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAccountTab = mode === "login" || mode === "register";

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
                {TITLES[mode]}
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

              {/* Tab switch (disembunyikan saat lupa / reset password) */}
              {isAccountTab && (
              <div className="flex bg-offwhite rounded-full p-1 mb-6">
                <button
                  onClick={() => switchMode("login")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-full transition-all duration-300 ${
                    mode === "login" ? "bg-gold-gradient text-white shadow-gold" : "text-charcoal/60"
                  }`}
                >
                  <LogIn size={15} />
                  Masuk
                </button>
                <button
                  onClick={() => switchMode("register")}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-full transition-all duration-300 ${
                    mode === "register" ? "bg-gold-gradient text-white shadow-gold" : "text-charcoal/60"
                  }`}
                >
                  <UserPlus size={15} />
                  Daftar
                </button>
              </div>
              )}

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
                    <div className="-mt-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginForm.email);
                          switchMode("forgot");
                        }}
                        className="text-xs text-gold-dark font-semibold hover:underline"
                      >
                        Lupa password?
                      </button>
                    </div>
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
                ) : mode === "forgot" ? (
                  <motion.form
                    key="forgot"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleForgotSubmit}
                    className="space-y-4"
                  >
                    {info ? (
                      <div className="flex items-start gap-2.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                        <span>{info} Link berlaku 30 menit.</span>
                      </div>
                    ) : (
                      <p className="text-sm text-charcoal/60">
                        Masukkan email akun kamu. Kami akan mengirim link untuk membuat password baru.
                      </p>
                    )}
                    <InputField
                      icon={Mail}
                      label="Email"
                      name="email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nama@email.com"
                      required
                    />
                    <SubmitButton
                      isSubmitting={isSubmitting}
                      label={info ? "Kirim Ulang Link" : "Kirim Link Reset"}
                    />
                    <BackToLogin onClick={() => switchMode("login")} />
                  </motion.form>
                ) : mode === "reset" ? (
                  <motion.form
                    key="reset"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleResetSubmit}
                    className="space-y-4"
                  >
                    <p className="text-sm text-charcoal/60">
                      Buat password baru untuk akun kamu. Setelah disimpan, kamu langsung masuk dan
                      sesi login di perangkat lain otomatis keluar.
                    </p>
                    <InputField
                      icon={Lock}
                      label="Password Baru"
                      name="password"
                      type="password"
                      value={resetForm.password}
                      onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Minimal 8 karakter"
                      required
                    />
                    <InputField
                      icon={Lock}
                      label="Konfirmasi Password Baru"
                      name="confirmPassword"
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={(e) =>
                        setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      placeholder="Ulangi password baru"
                      required
                    />
                    <SubmitButton isSubmitting={isSubmitting} label="Simpan Password Baru" />
                    <p className="text-xs text-center text-charcoal/45">
                      Link kedaluwarsa?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-gold-dark font-semibold hover:underline"
                      >
                        Minta link baru
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

function BackToLogin({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-charcoal/50 hover:text-gold-dark font-semibold"
    >
      <ArrowLeft size={13} />
      Kembali ke halaman masuk
    </button>
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
