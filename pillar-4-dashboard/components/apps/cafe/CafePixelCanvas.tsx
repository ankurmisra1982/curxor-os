"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CafeInspectFlyout } from "@/components/apps/cafe/CafeInspectFlyout";
import { drawArchitectSprite } from "@/lib/cafe-architect-sprite";
import type { CafeCharacter } from "@/lib/claw-cafe-spatial";
import {
  architectInspectable,
  architectWhisperTier,
  buildYardClawSprites,
  EASTER_EGG_COPY,
  gridHitsStation,
  isNightWindowHour,
  nightWindowActive,
  patronNearStation,
  type CafeEasterEggId,
  type YardClawSprite,
} from "@/lib/cafe-easter-eggs";
import {
  type AnimatedCafeCharacter,
  type PatronState,
  buildAnimatedCharacters,
  canvasPixelSize,
  defaultPatronPos,
  findInspectableCharacter,
  movePatron,
  pixelToGrid,
  stepToward,
  STATION_SPRITES,
  tickAnimatedCharacters,
  TILE_SIZE,
  PIXEL_SCALE,
  CAFE_GRID_COLS,
  CAFE_GRID_ROWS,
  stationGridPos,
} from "@/lib/cafe-pixel-engine";
import type { GrowthLevel } from "@/lib/os-growth-level";

interface CafePixelCanvasProps {
  characters: CafeCharacter[];
  lastPulseAt?: string | null;
  ascensionSnippet?: string | null;
  growthLevel?: GrowthLevel;
  visionConnected?: boolean;
  builderBridgeLinked?: boolean;
  yardActUntilMs?: number;
}

const PATRON_COLOR = "#e8f4ff";
const PATRON_OUTLINE = "#5b9bd5";
const CHAR_SIZE = 14;

interface DrawRoomOptions {
  eno2Frozen: boolean;
  nightWindow: boolean;
  builderBridgeLinked: boolean;
  yardSprites: YardClawSprite[];
  growthLevel: GrowthLevel;
  architectPulseMs: number;
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  scale: number,
  animated: AnimatedCafeCharacter[],
  patron: PatronState,
  options: DrawRoomOptions,
) {
  const tile = TILE_SIZE * scale;
  const { width, height } = canvasPixelSize(scale);

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, width, height);

  for (let row = 0; row < CAFE_GRID_ROWS; row++) {
    for (let col = 0; col < CAFE_GRID_COLS; col++) {
      ctx.fillStyle = (col + row) % 2 === 0 ? "#121218" : "#0e0e14";
      ctx.fillRect(col * tile, row * tile, tile, tile);
      if (options.nightWindow && row === 0) {
        ctx.fillStyle = "rgba(90,120,200,0.15)";
        ctx.fillRect(col * tile, row * tile, tile, tile);
        ctx.fillStyle = "#c8d8ff";
        for (let s = 0; s < 2; s++) {
          const sx = col * tile + 6 + s * 10;
          const sy = row * tile + 6 + (col % 2) * 4;
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
    }
  }

  const nook = stationGridPos("blueprint_nook");
  ctx.fillStyle = "rgba(18,20,32,0.45)";
  ctx.fillRect(nook.col * tile + 2, nook.row * tile + 2, tile - 4, tile - 4);
  ctx.strokeStyle = "rgba(122,140,255,0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(nook.col * tile + 3, nook.row * tile + 3, tile - 6, tile - 6);
  ctx.fillStyle = "rgba(94,207,255,0.12)";
  ctx.fillRect(nook.col * tile + 8, nook.row * tile + 10, tile - 16, tile - 18);

  for (const station of STATION_SPRITES) {
    const pos = stationGridPos(station.id);
    const x = pos.col * tile + 2;
    const y = pos.row * tile + 2;
    const size = tile - 4;
    ctx.fillStyle = station.bg;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = station.accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = station.accent;
    ctx.font = `bold ${8 * scale}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(station.short, x + size / 2, y + size / 2 - 4);
    ctx.font = `${6 * scale}px monospace`;
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText(station.label.toUpperCase(), x + size / 2, y + size - 6);
  }

  const frozen = options.eno2Frozen;
  for (const c of animated) {
    const cx = c.col * tile + tile / 2;
    const cy = c.row * tile + tile / 2;
    const pulse = frozen ? 1 : c.displayState === "celebrate" ? 1.15 : c.displayState === "act" ? 1.08 : 1;
    const size = CHAR_SIZE * scale * pulse;
    ctx.fillStyle = frozen
      ? "#3a5a6a"
      : c.displayState === "celebrate"
        ? "#ffd966"
        : c.displayState === "act"
          ? "#6fdc8c"
          : c.displayState === "walk"
            ? "#8ab4f8"
            : "#4a5568";
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.strokeStyle = frozen ? "#5b9bd5" : "#e8f4ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${7 * scale}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const code = c.label.slice(0, 3).toUpperCase();
    ctx.fillText(code, cx, cy);
    if (!frozen && c.bubble && c.displayState !== "walk") {
      ctx.fillStyle = "rgba(10,10,12,0.9)";
      const bw = Math.min(tile * 1.4, 90 * scale);
      ctx.fillRect(cx - bw / 2, cy - size - 14 * scale, bw, 10 * scale);
      ctx.fillStyle = "#5b9bd5";
      ctx.font = `${5 * scale}px monospace`;
      const text = c.bubble.length > 18 ? `${c.bubble.slice(0, 16)}…` : c.bubble;
      ctx.fillText(text, cx, cy - size - 9 * scale);
    }
  }

  for (const yard of options.yardSprites) {
    const cx = yard.col * tile + tile / 2;
    const cy = yard.row * tile + tile / 2;
    const size = (CHAR_SIZE - 2) * scale * (yard.state === "act" ? 1.12 : 1);
    ctx.fillStyle = yard.state === "act" ? "#e8d44d" : "#6a5a2a";
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.strokeStyle = "#e8f4ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    ctx.fillStyle = "#fff8dc";
    ctx.font = `bold ${6 * scale}px monospace`;
    ctx.fillText(yard.label.slice(-1), cx, cy);
  }

  drawArchitectSprite(ctx, nook.col * tile + tile / 2, nook.row * tile + tile / 2, scale, {
    growthLevel: options.growthLevel,
    builderBridgeLinked: options.builderBridgeLinked,
    pulseMs: options.architectPulseMs,
    tile,
  });

  const px = patron.col * tile + tile / 2;
  const py = patron.row * tile + tile / 2;
  const pSize = (CHAR_SIZE + 2) * scale;
  ctx.fillStyle = PATRON_COLOR;
  ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize, pSize);
  ctx.strokeStyle = PATRON_OUTLINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(px - pSize / 2, py - pSize / 2, pSize, pSize);
  ctx.fillStyle = PATRON_OUTLINE;
  ctx.font = `bold ${7 * scale}px monospace`;
  ctx.fillText("YOU", px, py);
}

export function CafePixelCanvas({
  characters,
  lastPulseAt,
  ascensionSnippet,
  growthLevel = "L1",
  visionConnected = false,
  builderBridgeLinked = false,
  yardActUntilMs = 0,
}: CafePixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedRef = useRef<AnimatedCafeCharacter[]>([]);
  const patronRef = useRef<PatronState>(defaultPatronPos());
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const pulseMsRef = useRef(0);
  const [inspectChar, setInspectChar] = useState<AnimatedCafeCharacter | null>(null);
  const [showArchitect, setShowArchitect] = useState(false);
  const [dismissedInspectId, setDismissedInspectId] = useState<string | null>(null);
  const [eno2Frozen, setEno2Frozen] = useState(false);
  const [eggToast, setEggToast] = useState<CafeEasterEggId | null>(null);
  const [yardTick, setYardTick] = useState(0);

  const yardSprites = useMemo(
    () => buildYardClawSprites(visionConnected, yardActUntilMs),
    [visionConnected, yardActUntilMs, yardTick],
  );
  const hour = new Date().getHours();
  const nightWindow = isNightWindowHour(hour);

  const showEgg = useCallback((id: CafeEasterEggId) => {
    setEggToast(id);
    window.setTimeout(() => setEggToast(null), 4000);
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawRoom(ctx, PIXEL_SCALE, animatedRef.current, patronRef.current, {
      eno2Frozen,
      nightWindow,
      builderBridgeLinked,
      yardSprites,
      growthLevel,
      architectPulseMs: pulseMsRef.current,
    });
  }, [eno2Frozen, nightWindow, builderBridgeLinked, yardSprites, growthLevel]);

  const syncInspectable = useCallback(() => {
    if (architectInspectable(growthLevel, patronRef.current)) {
      setShowArchitect(true);
      setInspectChar(null);
      return;
    }
    setShowArchitect(false);
    const found = findInspectableCharacter(patronRef.current, animatedRef.current);
    if (!found) {
      setInspectChar(null);
      setDismissedInspectId(null);
      return;
    }
    if (dismissedInspectId === found.id) {
      setInspectChar(null);
      return;
    }
    setInspectChar(found);
  }, [dismissedInspectId, growthLevel]);

  useEffect(() => {
    animatedRef.current = buildAnimatedCharacters(characters, animatedRef.current);
    paint();
    syncInspectable();
  }, [characters, paint, syncInspectable]);

  useEffect(() => {
    if (!visionConnected || yardActUntilMs <= Date.now()) return;
    const id = window.setInterval(() => setYardTick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [visionConnected, yardActUntilMs]);

  useEffect(() => {
    paint();
  }, [yardTick, paint]);

  useEffect(() => {
    const loop = (ts: number) => {
      const prev = lastFrameRef.current || ts;
      const dt = ts - prev;
      lastFrameRef.current = ts;
      pulseMsRef.current = ts;
      if (!eno2Frozen) {
        animatedRef.current = tickAnimatedCharacters(animatedRef.current, dt);
      }
      paint();
      syncInspectable();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [paint, syncInspectable, eno2Frozen]);

  const handlePatronMove = useCallback(
    (next: PatronState) => {
      patronRef.current = next;
      setDismissedInspectId(null);
      if (nightWindowActive(next, hour)) showEgg("window_night");
      paint();
      syncInspectable();
    },
    [hour, paint, showEgg, syncInspectable],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "e" || e.key === "E") {
        setEno2Frozen((prev) => {
          const next = !prev;
          if (next) showEgg("eno2_freeze");
          return next;
        });
        return;
      }
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      handlePatronMove(movePatron(patronRef.current, dir));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePatronMove, showEgg]);

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const target = pixelToGrid(px, py, PIXEL_SCALE);

      const station = gridHitsStation(target.col, target.row);
      if (station === "coffee") {
        showEgg("coffee");
        handlePatronMove(target);
        return;
      }
      if (station === "mailbox" && patronNearStation(patronRef.current, "mailbox")) {
        setEno2Frozen((prev) => {
          const next = !prev;
          if (next) showEgg("eno2_freeze");
          return next;
        });
        return;
      }
      if (station === "blueprint_nook") {
        if (architectInspectable(growthLevel, patronRef.current) || architectInspectable(growthLevel, target)) {
          if (target.col === stationGridPos("blueprint_nook").col && target.row === stationGridPos("blueprint_nook").row) {
            patronRef.current = target;
          }
          syncInspectable();
          paint();
          return;
        }
        showEgg("architect_whisper");
        if (target.col === stationGridPos("blueprint_nook").col && target.row === stationGridPos("blueprint_nook").row) {
          patronRef.current = target;
          paint();
        }
        return;
      }

      const next = stepToward(patronRef.current, target);
      if (next.col !== patronRef.current.col || next.row !== patronRef.current.row) {
        handlePatronMove(next);
      }
    },
    [growthLevel, handlePatronMove, paint, showEgg, syncInspectable],
  );

  const { width, height } = canvasPixelSize(PIXEL_SCALE);

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <p className="text-muted uppercase tracking-widest">
        Pixel room · {characters.length} Claw{characters.length === 1 ? "" : "s"}
        {visionConnected ? " · yard LIVE" : ""}
        {builderBridgeLinked ? " · builder link" : ""}
        {architectWhisperTier(growthLevel) ? " · architect whisper" : ""}
        {eno2Frozen ? " · eno2 hold" : ""}
        {lastPulseAt ? ` · pulse ${new Date(lastPulseAt).toLocaleTimeString()}` : ""}
      </p>
      {eggToast ? (
        <p className="border border-cursor-glow/40 bg-panel px-2 py-1 text-cursor-glow">{EASTER_EGG_COPY[eggToast]}</p>
      ) : null}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          tabIndex={0}
          role="img"
          aria-label="Claw Cafe pixel room"
          onClick={onCanvasClick}
          className="max-w-full cursor-crosshair border border-line bg-void outline-none focus:border-cursor-glow"
          style={{ imageRendering: "pixelated", width: `${width}px`, height: `${height}px` }}
        />
        {showArchitect ? (
          <div className="min-w-[14rem] flex-1 border border-cursor-glow/40 bg-panel p-3 shadow-cursor">
            <p className="uppercase tracking-widest text-cursor-glow">The Architect</p>
            <p className="mt-1 text-muted">blueprint nook · Build Plane easter egg</p>
            <p className="mt-2 text-stark">
              {builderBridgeLinked
                ? "Builder link active — Build Plane connected on this box."
                : EASTER_EGG_COPY.architect}
            </p>
            <Link
              href="/settings"
              className="mt-3 inline-block border border-line px-3 py-1 uppercase tracking-widest text-muted hover:border-cursor-glow hover:text-cursor-glow"
            >
              Build Plane settings
            </Link>
          </div>
        ) : inspectChar ? (
          <div className="min-w-[14rem] flex-1">
            <CafeInspectFlyout
              character={inspectChar}
              ascensionSnippet={ascensionSnippet}
              onClose={() => {
                setDismissedInspectId(inspectChar.id);
                setInspectChar(null);
              }}
            />
          </div>
        ) : (
          <p className="text-muted lg:max-w-xs">
            Walk adjacent to a Claw to inspect · coffee click · E toggles eno2 freeze · blueprint nook (Host L4+)
          </p>
        )}
      </div>
    </div>
  );
}
