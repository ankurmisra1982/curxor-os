import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#000000",
        panel: "#0a0a0a",
        surface: "#111111",
        line: "#222222",
        muted: "#8a8a8a",
        stark: "#ffffff",
        cursor: {
          DEFAULT: "#a855f7",
          glow: "#bc13fe",
          dim: "#6b21a8",
        },
      },
      fontFamily: {
        mono: ["var(--font-jetbrains)", "var(--font-fira)", "ui-monospace", "monospace"],
        display: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        cursor: "0 0 12px rgba(188, 19, 254, 0.35)",
        panel: "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      animation: {
        pulse-cursor: "pulse-cursor 2s ease-in-out infinite",
        scanline: "scanline 8s linear infinite",
      },
      keyframes: {
        "pulse-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
