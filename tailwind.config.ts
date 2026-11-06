import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: "#FACC15",
          500: "#EAB308",
          600: "#CA8A04",
        },
        casino: {
          dark: "#0a0a0f",
          card: "#12121e",
          border: "#232338",
          accent: "#ff2a5f",
          gold: "#f59e0b",
          neon: "#00f0ff",
        },
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(245, 158, 11, 0.4), inset 0 0 15px rgba(245, 158, 11, 0.2)" },
          "100%": { boxShadow: "0 0 35px rgba(245, 158, 11, 0.9), inset 0 0 25px rgba(245, 158, 11, 0.4)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
