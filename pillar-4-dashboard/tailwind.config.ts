import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "var(--color-void)",
        panel: "var(--color-panel)",
        surface: "var(--color-surface)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        stark: "var(--color-stark)",
        cursor: {
          DEFAULT: "var(--color-cursor)",
          glow: "var(--color-cursor-glow)",
          dim: "var(--color-cursor-dim)",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["var(--font-jetbrains)", "var(--font-fira)", "ui-monospace", "monospace"],
        display: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        cursor: "var(--shadow-cursor)",
        panel: "inset 0 1px 0 rgba(255,255,255,0.04)",
      },
      animation: {
        "pulse-cursor": "pulse-cursor 2s ease-in-out infinite",
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
