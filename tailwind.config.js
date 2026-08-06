/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#14151F",
        surface: "#1D1F2E",
        "surface-raised": "#262838",
        "surface-line": "#33364A",
        ink: {
          100: "#EDEEF5",
          300: "#B7B9CC",
          500: "#8B8DA3",
        },
        brass: {
          DEFAULT: "#D4A24C",
          bright: "#E8C077",
          dim: "#8A6C34",
        },
        cipher: {
          DEFAULT: "#5B7FDE",
          bright: "#89A6EE",
          dim: "#324578",
        },
        signal: {
          success: "#5FBF8B",
          danger: "#E0575B",
        },
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "grain": "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
      },
      keyframes: {
        "cipher-scramble": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "seal-stamp": {
          "0%": { transform: "scale(1.6) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(0.94) rotate(1deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(212,162,76,0.35)" },
          "100%": { boxShadow: "0 0 0 8px rgba(212,162,76,0)" },
        },
      },
      animation: {
        "cipher-scramble": "cipher-scramble 0.15s ease-out",
        "seal-stamp": "seal-stamp 0.42s cubic-bezier(.2,.9,.3,1.1)",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};
