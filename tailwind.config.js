/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#0a0f1a",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
        },
        indigoDeep: {
          DEFAULT: "#1e3a5f",
          light: "#2d4f7d",
          dark: "#152947",
        },
        ember: {
          DEFAULT: "#ff6b35",
          light: "#ff8c5e",
          dark: "#e55a2b",
        },
        mint: {
          DEFAULT: "#2ec4b6",
          light: "#5ed5ca",
          dark: "#239e93",
        },
        coral: {
          DEFAULT: "#e71d36",
          light: "#ef4a5e",
          dark: "#c0182d",
        },
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(255, 107, 53, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(255, 107, 53, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
