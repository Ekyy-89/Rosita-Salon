/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        offwhite: "#F9FAFB",
        gold: {
          DEFAULT: "#D4AF37",
          dark: "#C5A059",
          light: "#E8D9A6",
        },
        charcoal: "#1A1A1A",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "serif"],
        sans: ["'Poppins'", "sans-serif"],
      },
      boxShadow: {
        gold: "0 10px 30px -10px rgba(212, 175, 55, 0.35)",
        soft: "0 4px 20px rgba(26, 26, 26, 0.06)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #D4AF37 0%, #C5A059 100%)",
      },
      animation: {
        "spin-slow": "spin 12s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
      },
    },
  },
  plugins: [],
};
