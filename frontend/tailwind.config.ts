import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        calm: "#2563eb",
        warn: "#d97706",
        urgent: "#dc2626",
      },
      keyframes: {
        pulseUrgent: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(220,38,38,0.5)" },
          "50%": { boxShadow: "0 0 0 8px rgba(220,38,38,0)" },
        },
      },
      animation: {
        "pulse-urgent": "pulseUrgent 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
