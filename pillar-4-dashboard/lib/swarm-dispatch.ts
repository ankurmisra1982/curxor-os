import {
  SWARM_GRID,
  pickDispatchUnit,
  swarmConfigFromFre,
  type SwarmDispatchPolicy,
  type SwarmGridCell,
  type SwarmUnit,
} from "./swarm-fleet";

export interface SwarmDispatchHints {
  selectedUnitId?: string;
  targetCell?: SwarmGridCell;
}

export interface SwarmDispatchPlan {
  skillId: "assign_route" | "recall_vehicle" | "ping_unit" | "rebalance";
  autoDispatch: boolean;
  hints: SwarmDispatchHints;
  reply: string;
}

const CELL_RE = /\b([A-D][1-4])\b/i;

export function parseTargetCellFromMessage(message: string): SwarmGridCell | null {
  const match = message.match(CELL_RE);
  if (!match?.[1]) return null;
  const cell = match[1].toUpperCase();
  return SWARM_GRID.includes(cell as SwarmGridCell) ? (cell as SwarmGridCell) : null;
}

export function resolveSwarmDispatchPlan(
  message: string,
  config: Record<string, unknown>,
  fleet: SwarmUnit[],
): SwarmDispatchPlan | null {
  const combined = message.toLowerCase();
  const swarmConfig = swarmConfigFromFre(config);
  const policy = swarmConfig.dispatchPolicy as SwarmDispatchPolicy;

  const existingUnit =
    typeof config.selectedUnitId === "string" ? config.selectedUnitId : fleet[0]?.id ?? "";
  const existingTarget =
    typeof config.targetCell === "string" && SWARM_GRID.includes(config.targetCell as SwarmGridCell)
      ? (config.targetCell as SwarmGridCell)
      : null;

  if (/recall|depot|return\b/.test(combined)) {
    return {
      skillId: "recall_vehicle",
      autoDispatch: true,
      hints: { selectedUnitId: existingUnit },
      reply: `Recalling ${existingUnit || "selected unit"} to depot ${swarmConfig.depotGrid}.`,
    };
  }

  if (/rebalance|spread|evenly/.test(combined)) {
    return {
      skillId: "rebalance",
      autoDispatch: true,
      hints: {},
      reply: `Rebalancing fleet using ${policy} policy.`,
    };
  }

  if (/assign|dispatch|send|route|workload|lowest/.test(combined)) {
    const parsedCell = parseTargetCellFromMessage(message) ?? existingTarget ?? ("B3" as SwarmGridCell);
    const pick =
      /lowest|best|fastest|latency/.test(combined)
        ? pickDispatchUnit(fleet, "latency")
        : /charge|headroom/.test(combined)
          ? pickDispatchUnit(fleet, "charge")
          : pickDispatchUnit(fleet, policy) ?? fleet.find((u) => u.id === existingUnit);

    const unitId = pick?.id ?? existingUnit;
    if (!unitId) return null;

    return {
      skillId: "assign_route",
      autoDispatch: true,
      hints: { selectedUnitId: unitId, targetCell: parsedCell },
      reply: `Dispatching ${pick?.label ?? unitId} → ${parsedCell} (${policy} policy).`,
    };
  }

  if (/ping|latency|rtt|health/.test(combined)) {
    const pick = pickDispatchUnit(fleet, policy) ?? fleet.find((u) => u.id === existingUnit);
    const unitId = pick?.id ?? existingUnit;
    return {
      skillId: "ping_unit",
      autoDispatch: true,
      hints: { selectedUnitId: unitId },
      reply: `Pinging ${pick?.label ?? unitId} via mesh RTT probe.`,
    };
  }

  return null;
}

export function isSwarmAutoDispatchSkill(skillId: string): boolean {
  return skillId === "assign_route" || skillId === "recall_vehicle" || skillId === "ping_unit" || skillId === "rebalance";
}
