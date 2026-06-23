/**
 * Per-Claw pixel sprites — 2-frame walk cycle, approval pulse.
 */

import { OOTB_APPS } from "./ootb-apps";

export interface ClawSpritePalette {
  body: string;
  accent: string;
  code: string;
}

const PALETTES: Record<string, ClawSpritePalette> = {
  "my-work": { body: "#1a2a3a", accent: "#5b9bd5", code: "OUT" },
  "my-content-creator": { body: "#2a1a3a", accent: "#c77dff", code: "CRE" },
  "my-capital": { body: "#1a3a2a", accent: "#6fdc8c", code: "CAP" },
  "claw-forge": { body: "#3a2a1a", accent: "#ffb347", code: "FOR" },
  "robotaxi-fleet-manager": { body: "#2a2a1a", accent: "#e8d44d", code: "SW" },
  "my-vital": { body: "#1a2a2a", accent: "#5fd4c8", code: "VIT" },
  "my-family": { body: "#2a1a2a", accent: "#ff8fab", code: "KIN" },
  "my-shop": { body: "#2a251a", accent: "#d4a574", code: "ARB" },
  "tesla-optimus-engine": { body: "#1a1a2a", accent: "#7a8cff", code: "SIG" },
};

const DEFAULT_PALETTE: ClawSpritePalette = { body: "#252530", accent: "#888899", code: "CLW" };

export function paletteForApp(appId: string, label: string): ClawSpritePalette {
  const hit = PALETTES[appId];
  if (hit) return hit;
  if (appId.startsWith("forged-") || appId.startsWith("claw-")) {
    return { body: "#3a2a1a", accent: "#ffb347", code: label.slice(0, 3).toUpperCase() || "FG" };
  }
  const ootb = OOTB_APPS.find((a) => a.id === appId);
  return ootb ? (PALETTES[ootb.id] ?? { ...DEFAULT_PALETTE, code: ootb.short }) : DEFAULT_PALETTE;
}

export function walkFrameIndex(tsMs: number, walking: boolean): number {
  if (!walking) return 0;
  return Math.floor(tsMs / 180) % 2;
}

export function drawClawSprite(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  appId: string,
  label: string,
  options: {
    frame?: number;
    state?: string;
    needsApproval?: boolean;
    frozen?: boolean;
  } = {},
): void {
  const { frame = 0, state = "idle", needsApproval = false, frozen = false } = options;
  const pal = paletteForApp(appId, label);
  const legOffset = frame === 1 ? size * 0.08 : 0;
  const pulse =
    frozen ? 1 : needsApproval ? 1.12 : state === "celebrate" ? 1.15 : state === "act" ? 1.08 : 1;
  const w = size * pulse;
  const h = size * pulse;

  const bodyColor = frozen
    ? "#3a5a6a"
    : needsApproval
      ? "#4a3a1a"
      : state === "celebrate"
        ? "#ffd966"
        : state === "act"
          ? pal.accent
          : state === "walk"
            ? pal.body
            : pal.body;

  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - w / 2, cy - h / 2 - legOffset, w, h * 0.72);
  ctx.fillRect(cx - w * 0.22, cy + h * 0.2 + legOffset, w * 0.18, h * 0.22);
  ctx.fillRect(cx + w * 0.04, cy + h * 0.2 - legOffset, w * 0.18, h * 0.22);

  ctx.strokeStyle = needsApproval ? "#ffb347" : frozen ? "#5b9bd5" : pal.accent;
  ctx.lineWidth = needsApproval ? 2 : 1;
  ctx.strokeRect(cx - w / 2, cy - h / 2 - legOffset, w, h * 0.72);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.max(5, w * 0.38)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(pal.code, cx, cy - legOffset);
}
