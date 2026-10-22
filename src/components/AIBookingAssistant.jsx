// =====================================================================
// src/components/AIBookingAssistant.jsx
// Chat AI untuk tanya layanan & cari jadwal kosong. Saat user memilih
// slot rekomendasi, form booking biasa dibuka dengan data sudah terisi
// (layanan, tanggal, jam) — jadi reservasi tetap lewat satu alur yang sama.
// =====================================================================
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Clock, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { aiApi } from "../api/client";

const MAX_LENGTH = 500;

const QUICK_PROMPTS = [
  "Jadwal kosong hari ini?",
  "Mau creambath besok sore",
  "Berapa harga smoothing?",
];

const GREETING = {
  sender: "ai",
  text: "Halo! Saya AI Asisten Rosita Salon ✨ Mau tanya harga layanan atau cari jadwal kosong?",
};

function formatSlotDate(dateStr) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T00:00:00Z`));
}

export default function AIBookingAssistant({ onPickSlot, onRequireLogin }) {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  // Auto-scroll ke pesan terbaru
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading, isOpen]);

  const sendMessage = async (text) => {
    const userMsg = text.trim().slice(0, MAX_LENGTH);
    if (!userMsg || loading || !isAuthenticated) return;

    // Riwayat singkat dikirim supaya AI paham konteks ("yang jam 3 aja")
    const history = messages
      .slice(1)
      .filter((m) => !m.isError)
      .map(({ sender, text }) => ({ sender, text }));
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const data = await aiApi.chat({ message: userMsg, history });
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.message,
          slots: data.type === "recommendation" ? data.slots : undefined,
          serviceName: data.serviceName,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [...prev, { sender: "ai", text: error.message, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const pickSlot = (slot, serviceName) => {
    setIsOpen(false);
    onPickSlot({ serviceName: serviceName || "", date: slot.date, time: slot.time });
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Tutup AI Asisten" : "Buka AI Asisten"}
        aria-expanded={isOpen}
        className="fixed bottom-5 right-5 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-gold-gradient text-white shadow-gold hover:shadow-lg flex items-center justify-center"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={24} />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="dialog"
            aria-label="AI Booking Assistant"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[370px] h-[min(520px,calc(100vh-8rem))] bg-white rounded-2xl shadow-2xl overflow-hidden z-50 border border-gold/15 flex flex-col"
          >
            <div className="bg-charcoal text-white px-4 py-3.5 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center">
                  <Sparkles size={15} />
                </span>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">AI Booking Assistant</h3>
                  <p className="text-[11px] text-white/50">Cek jadwal kosong & harga layanan</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Tutup"
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
              >
                <X size={17} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 p-4 overflow-y-auto bg-offwhite flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                      msg.sender === "user"
                        ? "bg-gold-gradient text-white rounded-br-md"
                        : msg.isError
                          ? "bg-red-50 text-red-600 border border-red-100 rounded-bl-md"
                          : "bg-white text-charcoal/80 border border-charcoal/5 rounded-bl-md shadow-sm"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.slots?.length > 0 && (
                    <div className="mt-2 w-full">
                      {msg.serviceName && (
                        <p className="text-[11px] text-charcoal/45 mb-1.5">Untuk: {msg.serviceName}</p>
                      )}
                      <div className="grid grid-cols-2 gap-1.5">
                        {msg.slots.map((slot) => (
                          <button
                            key={`${slot.date}-${slot.time}`}
                            onClick={() => pickSlot(slot, msg.serviceName)}
                            className="border border-gold/40 text-gold-dark bg-white py-1.5 px-2.5 rounded-lg text-xs font-semibold hover:bg-gold/10 transition-colors flex items-center gap-1.5"
                          >
                            <Clock size={12} />
                            {formatSlotDate(slot.date)} · {slot.time}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-charcoal/40 mt-1.5">
                        Klik salah satu jam untuk lanjut isi form booking.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="self-start bg-white border border-charcoal/5 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-gold animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              )}

              {isAuthenticated && messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs bg-white border border-gold/30 text-gold-dark px-3 py-1.5 rounded-full hover:bg-gold/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <form onSubmit={handleSubmit} className="p-3 border-t border-charcoal/5 bg-white flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanya jadwal atau harga layanan..."
                  maxLength={MAX_LENGTH}
                  disabled={loading}
                  aria-label="Pesan untuk AI"
                  className="flex-1 bg-offwhite rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  aria-label="Kirim"
                  className="bg-gold-gradient text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40"
                >
                  <Send size={16} />
                </button>
              </form>
            ) : (
              <div className="p-3 border-t border-charcoal/5 bg-white">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onRequireLogin();
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gold-gradient text-white text-sm font-semibold py-2.5 rounded-full shadow-gold"
                >
                  <LogIn size={15} />
                  Masuk dulu untuk chat dengan AI
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
