import type { ClawProfile } from "./claw-recommend";

export const SWARM_GRID = [
  "A1",
  "A2",
  "A3",
  "B1",
  "B2",
  "B3",
  "C1",
  "C2",
  "C3",
  "D1",
  "D2",
  "D3",
  "D4",
] as const;

export type SwarmGridCell = (typeof SWARM_GRID)[number];
export type SwarmDispatchPolicy = "latency" | "charge" | "round_robin";
export type SwarmUnitStatus = "idle" | "en route" | "busy" | "offline";

export interface SwarmUnit {
  id: string;
  label: string;
  grid: SwarmGridCell;
  latency: number;
  charge: number;
  status: SwarmUnitStatus;
  profileId: string | null;
  meshConnected: boolean;
  forgedAppSlug: string | null;
}

export interface SwarmForgeRosterEntry {
  id: string;
  name: string;
  intent: string;
  meshConnected: boolean;
  forgedAppSlug: string | null;
  provisioningMode: string | null;
}

function hashMetrics(seed: string): { latency: number; charge: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return {
    latency: 8 + (h % 22),
    charge: 32 + (h % 58),
  };
}

function shortUnitLabel(profileId: string, index: number): string {
  const suffix = profileId.replace(/^claw-/, "").slice(0, 4).toUpperCase();
  if (suffix.length >= 2) return `SW-${suffix}`;
  return `RX-${String(index + 1).padStart(2, "0")}`;
}

function parseFleetSize(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? "4"), 10);
  if (Number.isNaN(n)) return 4;
  return Math.min(8, Math.max(2, n));
}

function parsePolicy(raw: unknown): SwarmDispatchPolicy {
  if (raw === "charge" || raw === "round_robin") return raw;
  return "latency";
}

function parseDepot(raw: unknown): SwarmGridCell {
  const cell = typeof raw === "string" ? raw : "A1";
  return (SWARM_GRID.includes(cell as SwarmGridCell) ? cell : "A1") as SwarmGridCell;
}

function parseSecondaryDepot(raw: unknown): SwarmGridCell | null {
  if (typeof raw !== "string" || !raw.trim() || raw === "none") return null;
  return SWARM_GRID.includes(raw as SwarmGridCell) ? (raw as SwarmGridCell) : null;
}

const MOCK_UNITS: SwarmUnit[] = [
  { id: "RX-01", label: "RX-01", grid: "A3", latency: 12, charge: 82, status: "idle", profileId: null, meshConnected: false, forgedAppSlug: null },
  { id: "RX-02", label: "RX-02", grid: "B1", latency: 18, charge: 64, status: "idle", profileId: null, meshConnected: false, forgedAppSlug: null },
  { id: "RX-03", label: "RX-03", grid: "C3", latency: 9, charge: 91, status: "idle", profileId: null, meshConnected: false, forgedAppSlug: null },
  { id: "RX-04", label: "RX-04", grid: "D2", latency: 24, charge: 37, status: "idle", profileId: null, meshConnected: false, forgedAppSlug: null },
];

export function buildForgeRoster(profiles: ClawProfile[]): SwarmForgeRosterEntry[] {
  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    intent: p.intent,
    meshConnected: Boolean(p.meshConnected),
    forgedAppSlug: p.forgedAppSlug ?? null,
    provisioningMode: p.provisioningMode ?? null,
  }));
}

/** Build fleet units from Forge profiles, falling back to mock RX units. */
export function buildSwarmFleet(
  profiles: ClawProfile[],
  config: Record<string, unknown>,
): SwarmUnit[] {
  const fleetSize = parseFleetSize(config.fleetSize);
  const depot = parseDepot(config.depotGrid);

  if (profiles.length === 0) {
    return MOCK_UNITS.slice(0, fleetSize).map((u, i) => ({
      ...u,
      grid: i === 0 ? depot : u.grid,
    }));
  }

  const selected = profiles.slice(0, fleetSize);
  const spreadCells = spreadAcrossGrid(selected.length, depot);

  return selected.map((profile, index) => {
    const metrics = hashMetrics(profile.id);
    return {
      id: profile.id,
      label: shortUnitLabel(profile.id, index),
      grid: spreadCells[index] ?? depot,
      latency: metrics.latency,
      charge: metrics.charge,
      status: profile.meshConnected ? "idle" : "offline",
      profileId: profile.id,
      meshConnected: Boolean(profile.meshConnected),
      forgedAppSlug: profile.forgedAppSlug ?? null,
    };
  });
}

function spreadAcrossGrid(count: number, depot: SwarmGridCell): SwarmGridCell[] {
  const cells: SwarmGridCell[] = [depot];
  for (const cell of SWARM_GRID) {
    if (cells.length >= count) break;
    if (cell !== depot) cells.push(cell);
  }
  while (cells.length < count) cells.push(depot);
  return cells;
}

export function pickDispatchUnit(
  fleet: SwarmUnit[],
  policy: SwarmDispatchPolicy,
  roundRobinIndex = 0,
): SwarmUnit | null {
  const candidates = fleet.filter((u) => u.status !== "offline");
  if (candidates.length === 0) return null;

  if (policy === "latency") {
    return [...candidates].sort((a, b) => a.latency - b.latency)[0] ?? null;
  }
  if (policy === "charge") {
    return [...candidates].sort((a, b) => b.charge - a.charge)[0] ?? null;
  }
  return candidates[roundRobinIndex % candidates.length] ?? null;
}

export function applyRoute(fleet: SwarmUnit[], unitId: string, target: SwarmGridCell): SwarmUnit[] {
  return fleet.map((u) => {
    if (u.id !== unitId) return u;
    return {
      ...u,
      grid: target,
      status: "en route",
      latency: Math.max(8, u.latency - 2),
    };
  });
}

export function applyRecall(fleet: SwarmUnit[], unitId: string, depot: SwarmGridCell): SwarmUnit[] {
  return fleet.map((u) => (u.id === unitId ? { ...u, grid: depot, status: "idle" } : u));
}

export function applyPing(fleet: SwarmUnit[], unitId: string, rttMs?: number): SwarmUnit[] {
  return fleet.map((u) => {
    if (u.id !== unitId) return u;
    const latency = typeof rttMs === "number" ? rttMs : Math.max(6, u.latency - 3);
    return { ...u, latency, status: u.status === "offline" ? "idle" : u.status, meshConnected: true };
  });
}

export function rebalanceFleet(
  fleet: SwarmUnit[],
  policy: SwarmDispatchPolicy,
  depot: SwarmGridCell,
): SwarmUnit[] {
  const active = fleet.filter((u) => u.status !== "offline");
  const cells = spreadAcrossGrid(active.length, depot);
  let rr = 0;

  const ordered =
    policy === "latency"
      ? [...active].sort((a, b) => a.latency - b.latency)
      : policy === "charge"
        ? [...active].sort((a, b) => b.charge - a.charge)
        : active;

  const placement = new Map<string, SwarmGridCell>();
  for (let i = 0; i < ordered.length; i++) {
    const unit = policy === "round_robin" ? pickDispatchUnit(active, policy, rr++) ?? ordered[i] : ordered[i];
    if (!unit) continue;
    placement.set(unit.id, cells[i] ?? depot);
  }

  return fleet.map((u) => {
    const nextCell = placement.get(u.id);
    if (!nextCell) return u;
    return { ...u, grid: nextCell, status: "idle" };
  });
}

export function swarmConfigFromFre(config: Record<string, unknown>) {
  return {
    depotGrid: parseDepot(config.depotGrid),
    secondaryDepotGrid: parseSecondaryDepot(config.secondaryDepot),
    fleetSize: parseFleetSize(config.fleetSize),
    dispatchPolicy: parsePolicy(config.dispatchPolicy),
  };
}

export function countMeshLinked(fleet: SwarmUnit[]): number {
  return fleet.filter((u) => u.meshConnected).length;
}
