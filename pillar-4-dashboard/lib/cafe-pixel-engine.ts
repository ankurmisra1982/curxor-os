/**
 * Pure TS pixel room engine — grid, patron movement, character lerp, proximity inspect.
 */

import type { CafeCharacter, CafeCharacterState, CafeStationId } from "./claw-cafe-spatial";
import { CAFE_STATION_GRID } from "./claw-cafe-spatial";
import { OOTB_APPS } from "./ootb-apps";

export const CAFE_GRID_COLS = 5;
export const CAFE_GRID_ROWS = 4;
export const TILE_SIZE = 32;
export const PIXEL_SCALE = 2;

export interface GridPos {
  col: number;
  row: number;
}

export interface PatronState {
  col: number;
  row: number;
}

export interface AnimatedCafeCharacter {
  id: string;
  label: string;
  appId: string;
  bubble: string | null;
  station: CafeStationId;
  serverState: CafeCharacterState;
  displayState: CafeCharacterState;
  col: number;
  row: number;
  targetCol: number;
  targetRow: number;
  offsetCol: number;
  offsetRow: number;
  needsApproval?: boolean;
  approvalHref?: string | null;
}

export interface StationSprite {
  id: CafeStationId;
  label: string;
  short: string;
  bg: string;
  accent: string;
}

const STATION_SHORT: Record<CafeStationId, string> = {
  mailbox: "OUT",
  publish_desk: "CRE",
  ticker_wall: "CAP",
  anvil: "FOR",
  yard_dock: "SW",
  couch: "LOU",
  coffee: "CAF",
  blueprint_nook: "ARC",
  master_chamber: "MAI",
};

function stationShortCode(id: CafeStationId): string {
  return STATION_SHORT[id];
}

function stationColor(id: CafeStationId): { bg: string; accent: string } {
  const map: Record<CafeStationId, { bg: string; accent: string }> = {
    mailbox: { bg: "#1a2a3a", accent: "#5b9bd5" },
    publish_desk: { bg: "#2a1a3a", accent: "#c77dff" },
    ticker_wall: { bg: "#1a3a2a", accent: "#6fdc8c" },
    anvil: { bg: "#3a2a1a", accent: "#ffb347" },
    yard_dock: { bg: "#2a2a1a", accent: "#e8d44d" },
    couch: { bg: "#252525", accent: "#888888" },
    coffee: { bg: "#2a1f1a", accent: "#d4a574" },
    blueprint_nook: { bg: "#1a1a2a", accent: "#7a8cff" },
    master_chamber: { bg: "#0a0a14", accent: "#4a3a6a" },
  };
  return map[id];
}

export const STATION_SPRITES: StationSprite[] = (
  Object.entries(CAFE_STATION_GRID) as Array<[CafeStationId, (typeof CAFE_STATION_GRID)[CafeStationId]]>
)
  .filter(([id]) => id !== "blueprint_nook" && id !== "master_chamber")
  .map(([id, station]) => ({
  id,
  label: station.label,
  short: stationShortCode(id),
  bg: stationColor(id).bg,
  accent: stationColor(id).accent,
}));

export function stationGridPos(station: CafeStationId): GridPos {
  const cell = CAFE_STATION_GRID[station];
  return { col: cell.col, row: cell.row };
}

export function clampGrid(pos: GridPos): GridPos {
  return {
    col: Math.max(0, Math.min(CAFE_GRID_COLS - 1, pos.col)),
    row: Math.max(0, Math.min(CAFE_GRID_ROWS - 1, pos.row)),
  };
}

export function manhattanDistance(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

export function isAdjacentInspect(a: GridPos, b: GridPos): boolean {
  return manhattanDistance(a, b) <= 1;
}

export function defaultPatronPos(): PatronState {
  return { col: 2, row: 3 };
}

export function movePatron(patron: PatronState, dir: "up" | "down" | "left" | "right"): PatronState {
  const delta: Record<typeof dir, GridPos> = {
    up: { col: 0, row: -1 },
    down: { col: 0, row: 1 },
    left: { col: -1, row: 0 },
    right: { col: 1, row: 0 },
  };
  const next = clampGrid({
    col: patron.col + delta[dir].col,
    row: patron.row + delta[dir].row,
  });
  return next;
}

export function stepToward(from: GridPos, to: GridPos): GridPos {
  if (from.col === to.col && from.row === to.row) return from;
  const dc = Math.sign(to.col - from.col);
  const dr = Math.sign(to.row - from.row);
  if (Math.abs(to.col - from.col) >= Math.abs(to.row - from.row)) {
    return clampGrid({ col: from.col + dc, row: from.row });
  }
  return clampGrid({ col: from.col, row: from.row + dr });
}

export function characterStationOffset(appId: string, index: number): { offsetCol: number; offsetRow: number } {
  const hash = appId.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const slot = (hash + index) % 4;
  const offsets = [
    { offsetCol: 0, offsetRow: 0 },
    { offsetCol: 0.22, offsetRow: -0.12 },
    { offsetCol: -0.18, offsetRow: 0.1 },
    { offsetCol: 0.15, offsetRow: 0.14 },
  ];
  return offsets[slot] ?? offsets[0]!;
}

export function buildAnimatedCharacters(
  server: CafeCharacter[],
  prev: AnimatedCafeCharacter[],
): AnimatedCafeCharacter[] {
  return server.map((c, index) => {
    const target = stationGridPos(c.station);
    const { offsetCol, offsetRow } = characterStationOffset(c.appId, index);
    const existing = prev.find((p) => p.id === c.id);
    const stationChanged = Boolean(existing && existing.station !== c.station);
    const col = stationChanged ? (existing?.col ?? target.col) : target.col + offsetCol;
    const row = stationChanged ? (existing?.row ?? target.row) : target.row + offsetRow;
    return {
      id: c.id,
      label: c.label,
      appId: c.appId,
      bubble: c.bubble,
      station: c.station,
      serverState: c.state,
      displayState: stationChanged ? "walk" : c.state,
      col,
      row,
      targetCol: target.col + offsetCol,
      targetRow: target.row + offsetRow,
      offsetCol,
      offsetRow,
      needsApproval: c.needsApproval,
      approvalHref: c.approvalHref,
    };
  });
}

const LERP_SPEED_CELLS_PER_SEC = 2.5;

export function tickAnimatedCharacters(
  chars: AnimatedCafeCharacter[],
  dtMs: number,
): AnimatedCafeCharacter[] {
  const step = (LERP_SPEED_CELLS_PER_SEC * dtMs) / 1000;
  return chars.map((c) => {
    const dx = c.targetCol - c.col;
    const dy = c.targetRow - c.row;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.02) {
      return {
        ...c,
        col: c.targetCol,
        row: c.targetRow,
        displayState: c.serverState,
      };
    }
    const move = Math.min(step, dist);
    return {
      ...c,
      col: c.col + (dx / dist) * move,
      row: c.row + (dy / dist) * move,
      displayState: "walk",
    };
  });
}

export function findInspectableCharacter(
  patron: PatronState,
  chars: AnimatedCafeCharacter[],
): AnimatedCafeCharacter | null {
  const adjacent = chars.filter((c) =>
    isAdjacentInspect(patron, { col: Math.round(c.col), row: Math.round(c.row) }),
  );
  if (adjacent.length === 0) return null;
  adjacent.sort(
    (a, b) =>
      manhattanDistance(patron, { col: a.col, row: a.row }) -
      manhattanDistance(patron, { col: b.col, row: b.row }),
  );
  return adjacent[0] ?? null;
}

export function hrefForCafeApp(appId: string): string {
  const app = OOTB_APPS.find((a) => a.id === appId);
  if (app) return app.href;
  if (appId.startsWith("claw-") || appId.startsWith("forged-")) return "/claw-forge";
  return "/claw-cafe";
}

export function pixelToGrid(px: number, py: number, canvasScale = PIXEL_SCALE): GridPos {
  const tile = TILE_SIZE * canvasScale;
  return clampGrid({
    col: Math.floor(px / tile),
    row: Math.floor(py / tile),
  });
}

export function canvasPixelSize(scale = PIXEL_SCALE): { width: number; height: number } {
  return {
    width: CAFE_GRID_COLS * TILE_SIZE * scale,
    height: CAFE_GRID_ROWS * TILE_SIZE * scale,
  };
}
