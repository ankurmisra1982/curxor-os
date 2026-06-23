"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { CafeInspectFlyout } from "@/components/apps/cafe/CafeInspectFlyout";
import type { CafeCharacter } from "@/lib/claw-cafe-spatial";
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

interface CafePixelCanvasProps {
  characters: CafeCharacter[];
  lastPulseAt?: string | null;
  ascensionSnippet?: string | null;
}

const PATRON_COLOR = "#e8f4ff";
const PATRON_OUTLINE = "#5b9bd5";
const CHAR_SIZE = 14;

function drawRoom(
  ctx: CanvasRenderingContext2D,
  scale: number,
  animated: AnimatedCafeCharacter[],
  patron: PatronState,
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
    }
  }

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

  for (const c of animated) {
    const cx = c.col * tile + tile / 2;
    const cy = c.row * tile + tile / 2;
    const pulse = c.displayState === "celebrate" ? 1.15 : c.displayState === "act" ? 1.08 : 1;
    const size = CHAR_SIZE * scale * pulse;
    ctx.fillStyle =
      c.displayState === "celebrate"
        ? "#ffd966"
        : c.displayState === "act"
          ? "#6fdc8c"
          : c.displayState === "walk"
            ? "#8ab4f8"
            : "#4a5568";
    ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    ctx.strokeStyle = "#e8f4ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - size / 2, cy - size / 2, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${7 * scale}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const code = c.label.slice(0, 3).toUpperCase();
    ctx.fillText(code, cx, cy);
    if (c.bubble && c.displayState !== "walk") {
      ctx.fillStyle = "rgba(10,10,12,0.9)";
      const bw = Math.min(tile * 1.4, 90 * scale);
      ctx.fillRect(cx - bw / 2, cy - size - 14 * scale, bw, 10 * scale);
      ctx.fillStyle = "#5b9bd5";
      ctx.font = `${5 * scale}px monospace`;
      const text = c.bubble.length > 18 ? `${c.bubble.slice(0, 16)}…` : c.bubble;
      ctx.fillText(text, cx, cy - size - 9 * scale);
    }
  }

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

export function CafePixelCanvas({ characters, lastPulseAt, ascensionSnippet }: CafePixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedRef = useRef<AnimatedCafeCharacter[]>([]);
  const patronRef = useRef<PatronState>(defaultPatronPos());
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const [inspectChar, setInspectChar] = useState<AnimatedCafeCharacter | null>(null);
  const [dismissedInspectId, setDismissedInspectId] = useState<string | null>(null);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawRoom(ctx, PIXEL_SCALE, animatedRef.current, patronRef.current);
  }, []);

  const syncInspectable = useCallback(() => {
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
  }, [dismissedInspectId]);

  useEffect(() => {
    animatedRef.current = buildAnimatedCharacters(characters, animatedRef.current);
    paint();
    syncInspectable();
  }, [characters, paint, syncInspectable]);

  useEffect(() => {
    const loop = (ts: number) => {
      const prev = lastFrameRef.current || ts;
      const dt = ts - prev;
      lastFrameRef.current = ts;
      animatedRef.current = tickAnimatedCharacters(animatedRef.current, dt);
      paint();
      syncInspectable();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [paint, syncInspectable]);

  const handlePatronMove = useCallback(
    (next: PatronState) => {
      patronRef.current = next;
      setDismissedInspectId(null);
      paint();
      syncInspectable();
    },
    [paint, syncInspectable],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
  }, [handlePatronMove]);

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
      const next = stepToward(patronRef.current, target);
      if (next.col !== patronRef.current.col || next.row !== patronRef.current.row) {
        handlePatronMove(next);
      }
    },
    [handlePatronMove],
  );

  const { width, height } = canvasPixelSize(PIXEL_SCALE);

  return (
    <div className="space-y-2 font-mono text-[10px]">
      <p className="text-muted uppercase tracking-widest">
        Pixel room · {characters.length} Claw{characters.length === 1 ? "" : "s"} · arrows or click to walk
        {lastPulseAt ? ` · pulse ${new Date(lastPulseAt).toLocaleTimeString()}` : ""}
      </p>
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
        {inspectChar ? (
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
            Walk adjacent to a Claw (within one tile) to inspect and open their desk.
          </p>
        )}
      </div>
    </div>
  );
}
