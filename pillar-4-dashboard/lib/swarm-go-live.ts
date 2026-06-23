import "server-only";

import { readAppFreState } from "./app-fre-state";
import { readClawProfiles } from "./claw-profiles";
import { buildSwarmGrowthProfile } from "./swarm-growth";
import { countMeshLinked, buildSwarmFleet } from "./swarm-fleet";
import { listSwarmWorkloads } from "./swarm-workload-queue";
import { listSwarmXpEvents } from "./swarm-xp-events";
import { readUserSettings } from "./user-settings";

export type SwarmGoLiveStepStatus = "complete" | "warning" | "pending" | "optional";

export interface SwarmGoLiveStep {
  id: string;
  label: string;
  status: SwarmGoLiveStepStatus;
  detail: string;
}

export interface SwarmGoLiveReport {
  ready: boolean;
  demoReady: boolean;
  fleetReady: boolean;
  partiallyReady: boolean;
  progress: { complete: number; total: number };
  steps: SwarmGoLiveStep[];
}

function step(
  id: string,
  label: string,
  status: SwarmGoLiveStepStatus,
  detail: string,
): SwarmGoLiveStep {
  return { id, label, status, detail };
}

export async function buildSwarmGoLiveReport(): Promise<SwarmGoLiveReport> {
  const [fre, profiles, workloads, xpEvents, settings] = await Promise.all([
    readAppFreState("robotaxi-fleet-manager"),
    readClawProfiles(),
    listSwarmWorkloads(10),
    listSwarmXpEvents(5),
    readUserSettings(),
  ]);

  const growthProfile = buildSwarmGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.swarmGrowthLevel ?? null,
  );

  const fleet = buildSwarmFleet(profiles.claws, fre.config);
  const meshLinked = countMeshLinked(fleet);
  const pendingWorkloads = workloads.filter((w) => w.status === "pending").length;
  const hasForge = profiles.claws.length > 0;
  const hasDispatchXp = xpEvents.some(
    (e) => e.kind === "dispatch_completed" || e.kind === "workload_assigned",
  );

  const steps: SwarmGoLiveStep[] = [
    step(
      "fre",
      "Swarm FRE configured",
      fre.initialized ? "complete" : "pending",
      fre.initialized ? `${growthProfile.growthLabel} · ${fre.config.dispatchPolicy ?? "latency"}` : "Complete Swarm setup",
    ),
    step(
      "forge",
      "Forge fleet linked",
      hasForge ? "complete" : "warning",
      hasForge ? `${profiles.claws.length} Claw profile(s)` : "Mint Claws in The Forge for live roster",
    ),
    step(
      "workloads",
      "Cross-claw workload queue",
      workloads.length > 0 ? "complete" : "warning",
      workloads.length > 0 ? `${workloads.length} item(s) · ${pendingWorkloads} pending` : "Hand off from Work, Capital, or Creator",
    ),
    step(
      "mesh",
      "Mesh connectivity",
      meshLinked > 0 ? "complete" : "optional",
      meshLinked > 0 ? `${meshLinked} unit(s) mesh-linked` : "Optional until ground units connect",
    ),
    step(
      "dispatch",
      "Fleet dispatch proven",
      hasDispatchXp ? "complete" : "pending",
      hasDispatchXp ? "Dispatch or assign route logged" : "Run Assign Route or auto-dispatch from chat",
    ),
  ];

  const complete = steps.filter((s) => s.status === "complete").length;
  const demoReady = fre.initialized && (workloads.length > 0 || hasDispatchXp);
  const fleetReady = hasForge && hasDispatchXp && workloads.length > 0;

  return {
    ready: complete >= 4,
    demoReady,
    fleetReady,
    partiallyReady: complete >= 2,
    progress: { complete, total: steps.length },
    steps,
  };
}

export interface SwarmExitDemoResult {
  ok: boolean;
  workloads: Awaited<ReturnType<typeof listSwarmWorkloads>>;
  goLive: SwarmGoLiveReport;
  message: string;
}

/** Scripted exit-demo fleet scenario — seeds cross-claw workloads + XP milestone. */
export async function runSwarmExitDemoScenario(): Promise<SwarmExitDemoResult> {
  const { seedSwarmDemoWorkloads } = await import("./swarm-workload-queue");
  const { emitSwarmXpEvent } = await import("./swarm-xp-events");

  const workloads = await seedSwarmDemoWorkloads();
  await emitSwarmXpEvent("fleet_milestone", { scenario: "exit_demo_seed", count: workloads.length });
  await emitSwarmXpEvent("exit_demo_ready", { workloads: workloads.length });

  const goLive = await buildSwarmGoLiveReport();

  return {
    ok: true,
    workloads,
    goLive,
    message: `Exit-demo fleet scenario ready — ${workloads.length} cross-claw workloads seeded.`,
  };
}
