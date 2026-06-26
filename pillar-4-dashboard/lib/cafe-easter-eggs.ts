import type { GridPos, PatronState } from "./cafe-pixel-engine";
import { isAdjacentInspect, stationGridPos } from "./cafe-pixel-engine";
import type { CafeStationId } from "./claw-cafe-spatial";
import { CAFE_STATION_GRID } from "./claw-cafe-spatial";
import type { GrowthLevel } from "./os-growth-level";
import { meetsGrowthLevel } from "./os-growth-level";

export type CafeEasterEggId = "coffee" | "window_night" | "eno2_freeze" | "architect" | "architect_whisper";

export const ARCHITECT_OPACITY = { whisper: 0.22, idle: 0.4, linked: 0.85 } as const;

export function architectWhisperTier(growth: GrowthLevel): boolean {
  return !meetsGrowthLevel(growth, "L4");
}

export function architectRoomOpacity(growth: GrowthLevel, linked: boolean): number {
  if (architectWhisperTier(growth)) return ARCHITECT_OPACITY.whisper;
  return linked ? ARCHITECT_OPACITY.linked : ARCHITECT_OPACITY.idle;
}

export function architectPulseScale(linked: boolean, tsMs: number): number {
  if (!linked) return 1;
  return 1 + 0.055 * Math.sin(tsMs * 0.005);
}

export function isNightWindowHour(hour: number): boolean {
  return hour >= 20 || hour < 6;
}

/** Constellation window — clock night or operator stepped away from Flight Command. */
export function resolveCafeNightVisual(clockHour: number, operatorAway: boolean): boolean {
  return isNightWindowHour(clockHour) || operatorAway;
}

export function gridHitsStation(col: number, row: number): CafeStationId | null {
  for (const [id, cell] of Object.entries(CAFE_STATION_GRID)) {
    if (cell.col === col && cell.row === row) return id as CafeStationId;
  }
  return null;
}

export function patronOnStation(patron: PatronState, station: CafeStationId): boolean {
  const pos = stationGridPos(station);
  return patron.col === pos.col && patron.row === pos.row;
}

export function patronNearStation(patron: PatronState, station: CafeStationId): boolean {
  const pos = stationGridPos(station);
  return isAdjacentInspect(patron, pos) || patronOnStation(patron, station);
}

export function architectInspectable(growth: GrowthLevel, patron: PatronState): boolean {
  if (!meetsGrowthLevel(growth, "L4")) return false;
  return patronNearStation(patron, "blueprint_nook");
}

export function nightWindowActive(patron: PatronState, hour: number, operatorAway = false): boolean {
  if (operatorAway) return true;
  return isNightWindowHour(hour) && patron.row === 0;
}

export interface YardClawSprite {
  id: string;
  label: string;
  col: number;
  row: number;
  state: "idle" | "act";
}

export function buildYardClawSprites(visionConnected: boolean, yardActUntilMs: number): YardClawSprite[] {
  if (!visionConnected) return [];
  const base = stationGridPos("yard_dock");
  const acting = yardActUntilMs > Date.now();
  const offsets: GridPos[] = [
    { col: base.col - 0.35, row: base.row - 0.1 },
    { col: base.col - 0.1, row: base.row + 0.05 },
    { col: base.col + 0.15, row: base.row - 0.05 },
    { col: base.col + 0.35, row: base.row + 0.1 },
  ];
  return offsets.map((pos, i) => ({
    id: `yard-claw-0${i + 1}`,
    label: `CLAW-0${i + 1}`,
    col: pos.col,
    row: pos.row,
    state: acting ? "act" : "idle",
  }));
}

export const EASTER_EGG_COPY: Record<CafeEasterEggId, string> = {
  coffee: "Fresh brew — sovereignty tastes local.",
  window_night: "Constellation hour — the mesh keeps watch while you rest.",
  eno2_freeze: "eno2 paused — every Claw holds outbound until you release.",
  architect: "Builder overlay — optional. Connect in Settings when ready.",
  architect_whisper: "A faint figure sketches in the nook… Host tier unlocks The Architect.",
};
