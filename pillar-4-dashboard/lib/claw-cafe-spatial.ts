/** Spatial room character states — shared client/server. */

export type CafeCharacterState = "idle" | "walk" | "act" | "celebrate";

export type CafeStationId =
  | "mailbox"
  | "publish_desk"
  | "ticker_wall"
  | "anvil"
  | "yard_dock"
  | "couch"
  | "coffee"
  | "blueprint_nook"
  | "master_chamber";

export interface CafeCharacter {
  id: string;
  label: string;
  appId: string;
  station: CafeStationId;
  state: CafeCharacterState;
  bubble: string | null;
  lastEventAt: string | null;
  needsApproval?: boolean;
  approvalHref?: string | null;
}

/** Hidden tile — patron must discover bottom-right corner (col 4, row 3). */
export const MASTER_CHAMBER_GRID = { row: 3, col: 4 } as const;

export const CAFE_STATION_GRID: Record<CafeStationId, { row: number; col: number; label: string }> = {
  mailbox: { row: 0, col: 0, label: "Mail" },
  publish_desk: { row: 0, col: 2, label: "Publish" },
  ticker_wall: { row: 0, col: 4, label: "Ticker" },
  anvil: { row: 2, col: 0, label: "Forge" },
  yard_dock: { row: 2, col: 4, label: "Robotaxi Yard" },
  couch: { row: 3, col: 2, label: "Couch" },
  coffee: { row: 1, col: 1, label: "Coffee" },
  blueprint_nook: { row: 1, col: 3, label: "Blueprint" },
  master_chamber: { row: 3, col: 4, label: "Chamber" },
};

export const APP_STATION: Record<string, CafeStationId> = {
  "my-work": "mailbox",
  "my-content-creator": "publish_desk",
  "my-capital": "ticker_wall",
  "claw-forge": "anvil",
  "robotaxi-fleet-manager": "yard_dock",
  "claw-cafe": "coffee",
  "my-vital": "couch",
  "my-family": "couch",
  "tesla-optimus-engine": "yard_dock",
  "my-shop": "mailbox",
};

export function stationForApp(appId: string): CafeStationId {
  if (appId.startsWith("forged-") || appId.startsWith("claw-")) return "anvil";
  return APP_STATION[appId] ?? "couch";
}

export function stateForEventKind(kind: string): CafeCharacterState {
  if (kind.includes("archived")) return "walk";
  if (kind.includes("mint") || kind.includes("handshake") || kind === "streak.day") return "celebrate";
  if (kind.includes("approval")) return "act";
  if (
    kind.includes("publish") ||
    kind.includes("dispatch") ||
    kind.includes("sequence") ||
    kind.includes("rule") ||
    kind.includes("vital") ||
    kind.includes("kin") ||
    kind.includes("shop") ||
    kind.includes("signal")
  ) {
    return "act";
  }
  if (kind.includes("tour") || kind.includes("go_live")) return "walk";
  return "idle";
}
