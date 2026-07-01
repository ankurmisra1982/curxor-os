import type { TextScale } from "./user-settings-types";

export function isTextScale(v: unknown): v is TextScale {
  return v === "default" || v === "large" || v === "extra-large";
}

export function applyTextScale(scale: TextScale): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.textScale = scale;
}
