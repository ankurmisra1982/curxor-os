/**
 * Distinct pixel sprite for The Architect — taller silhouette, blueprint scroll, no desk label.
 */

import { architectPulseScale, architectRoomOpacity } from "./cafe-easter-eggs";
import type { GrowthLevel } from "./os-growth-level";

export const ARCHITECT_LINKED_BUBBLE = "Builder link active";

export interface DrawArchitectOptions {
  growthLevel: GrowthLevel;
  builderBridgeLinked: boolean;
  pulseMs: number;
  tile: number;
}

export function drawArchitectSprite(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  pixelScale: number,
  options: DrawArchitectOptions,
): void {
  const { growthLevel, builderBridgeLinked, pulseMs, tile } = options;
  const opacity = architectRoomOpacity(growthLevel, builderBridgeLinked);
  const pulse = architectPulseScale(builderBridgeLinked, pulseMs);
  const u = pixelScale;

  const bodyW = 7 * u * pulse;
  const bodyH = 13 * u * pulse;
  const headW = 6 * u * pulse;
  const headH = 5 * u * pulse;
  const hoodH = 3 * u * pulse;

  const footY = centerY + tile * 0.18;
  const bodyTop = footY - bodyH;
  const headTop = bodyTop - headH - hoodH;

  ctx.save();
  ctx.globalAlpha = opacity;

  if (builderBridgeLinked) {
    const glow = 10 * u * pulse;
    ctx.fillStyle = "rgba(122,140,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, glow, glow * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const bodyColor = builderBridgeLinked ? "#6a78c8" : "#3a4068";
  const hoodColor = builderBridgeLinked ? "#9aa8ff" : "#4a5088";
  const trimColor = builderBridgeLinked ? "#d8e0ff" : "#7a88b8";

  ctx.fillStyle = bodyColor;
  ctx.fillRect(centerX - bodyW / 2, bodyTop, bodyW, bodyH);
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(centerX - bodyW / 2, bodyTop, bodyW, bodyH);

  ctx.fillStyle = hoodColor;
  ctx.fillRect(centerX - headW / 2, bodyTop - headH, headW, headH);
  ctx.beginPath();
  ctx.moveTo(centerX - headW / 2, bodyTop - headH);
  ctx.lineTo(centerX, headTop);
  ctx.lineTo(centerX + headW / 2, bodyTop - headH);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = trimColor;
  ctx.stroke();

  const scrollW = 4 * u;
  const scrollH = 7 * u;
  const scrollX = centerX + bodyW / 2 + 1 * u;
  const scrollY = bodyTop + 2 * u;
  ctx.fillStyle = builderBridgeLinked ? "#5ecfff" : "#3a88aa";
  ctx.fillRect(scrollX, scrollY, scrollW, scrollH);
  ctx.strokeStyle = trimColor;
  ctx.strokeRect(scrollX, scrollY, scrollW, scrollH);
  ctx.fillStyle = builderBridgeLinked ? "#e8f8ff" : "#8ac4e8";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(scrollX + 1, scrollY + 2 + i * 2, scrollW - 2, 1);
  }

  ctx.fillStyle = trimColor;
  ctx.fillRect(centerX - 1 * u, bodyTop + bodyH * 0.35, 2 * u, 2 * u);

  if (builderBridgeLinked) {
    const bw = Math.min(tile * 1.5, 96 * u);
    const bubbleY = headTop - 8 * u;
    ctx.globalAlpha = Math.min(1, opacity + 0.1);
    ctx.fillStyle = "rgba(10,12,24,0.92)";
    ctx.fillRect(centerX - bw / 2, bubbleY - 9 * u, bw, 10 * u);
    ctx.fillStyle = "#9aa8ff";
    ctx.font = `bold ${5 * u}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ARCHITECT_LINKED_BUBBLE, centerX, bubbleY - 4 * u);
  }

  ctx.restore();
}
