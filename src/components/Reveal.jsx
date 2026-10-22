// =====================================================================
// src/components/Reveal.jsx
// Wrapper animasi "pop up" saat elemen masuk viewport ketika discroll.
// Dipakai membungkus heading/teks/kartu di semua section.
// =====================================================================
import { motion } from "framer-motion";

const VARIANTS = {
  up: {
    hidden: { opacity: 0, y: 40, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1 },
  },
  down: {
    hidden: { opacity: 0, y: -40, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1 },
  },
  left: {
    hidden: { opacity: 0, x: -50, scale: 0.96 },
    show: { opacity: 1, x: 0, scale: 1 },
  },
  right: {
    hidden: { opacity: 0, x: 50, scale: 0.96 },
    show: { opacity: 1, x: 0, scale: 1 },
  },
  pop: {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1 },
  },
};

/**
 * Reveal
 * Membungkus children dengan animasi "pop up" ketika elemen discroll masuk layar.
 *
 * Props:
 * - direction: "up" | "down" | "left" | "right" | "pop" (default: "up")
 * - delay: jeda animasi dalam detik (default: 0)
 * - duration: durasi animasi dalam detik (default: 0.6)
 * - once: apakah animasi hanya berjalan sekali (default: true)
 * - amount: seberapa besar elemen harus terlihat untuk memicu animasi (default: 0.2)
 * - as: tag/element motion yang dipakai (default: "div")
 */
export default function Reveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.25,
  className = "",
  as = "div",
}) {
  const MotionTag = motion[as] || motion.div;
  const variant = VARIANTS[direction] || VARIANTS.up;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={variant}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  );
}
