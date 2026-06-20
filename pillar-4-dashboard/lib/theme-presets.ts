import type { ColorScheme, ThemeMode } from "./user-settings-types";

export interface ThemePreset {
  id: ColorScheme;
  label: string;
  description: string;
  cursor: string;
  glow: string;
  dim: string;
  selection: string;
  shadow: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "curxor",
    label: "CurXor",
    description: "Electric violet — the default Flight Command look",
    cursor: "#a855f7",
    glow: "#bc13fe",
    dim: "#6b21a8",
    selection: "rgba(188, 19, 254, 0.35)",
    shadow: "0 0 12px rgba(188, 19, 254, 0.35)",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool cyan accents for a calmer desk",
    cursor: "#22d3ee",
    glow: "#06b6d4",
    dim: "#0e7490",
    selection: "rgba(6, 182, 212, 0.35)",
    shadow: "0 0 12px rgba(6, 182, 212, 0.35)",
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm gold highlights for long sessions",
    cursor: "#fbbf24",
    glow: "#f59e0b",
    dim: "#b45309",
    selection: "rgba(245, 158, 11, 0.35)",
    shadow: "0 0 12px rgba(245, 158, 11, 0.35)",
  },
  {
    id: "mono",
    label: "Mono",
    description: "Neutral white accents — minimal distraction",
    cursor: "#e5e5e5",
    glow: "#ffffff",
    dim: "#737373",
    selection: "rgba(255, 255, 255, 0.25)",
    shadow: "0 0 12px rgba(255, 255, 255, 0.15)",
  },
];

export function getThemePreset(id: ColorScheme): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0]!;
}

export function resolveThemeMode(mode: ThemeMode): "dark" | "light" {
  if (mode === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return mode === "light" ? "light" : "dark";
}

export function applyThemeToDocument(scheme: ColorScheme, themeMode: ThemeMode = "dark"): void {
  if (typeof document === "undefined") return;
  const preset = getThemePreset(scheme);
  const resolved = resolveThemeMode(themeMode);
  const root = document.documentElement;
  root.dataset.colorScheme = scheme;
  root.dataset.theme = resolved;
  root.style.setProperty("--color-cursor", preset.cursor);
  root.style.setProperty("--color-cursor-glow", preset.glow);
  root.style.setProperty("--color-cursor-dim", preset.dim);
  root.style.setProperty("--selection-bg", preset.selection);
  root.style.setProperty("--shadow-cursor", preset.shadow);
}
