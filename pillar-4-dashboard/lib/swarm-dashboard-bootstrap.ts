import "server-only";

import { readAppFreState } from "./app-fre-state";
import { readClawProfiles } from "./claw-profiles";
import {
  buildForgeRoster,
  buildSwarmFleet,
  countMeshLinked,
  swarmConfigFromFre,
  type SwarmUnit,
} from "./swarm-fleet";
import { buildSwarmGoLiveReport, type SwarmGoLiveReport } from "./swarm-go-live";
import { buildSwarmGrowthProfile, type SwarmGrowthProfile } from "./swarm-growth";
import { evaluateSwarmCafeBonus, listSwarmXpEvents, swarmXpStreak } from "./swarm-xp-events";
import { listSwarmWorkloads, type SwarmWorkloadItem } from "./swarm-workload-queue";
import { readUserSettings } from "./user-settings";

export interface SwarmDashboardBootstrap {
  ok: true;
  growthProfile: SwarmGrowthProfile;
  fleet: SwarmUnit[];
  forgeRoster: ReturnType<typeof buildForgeRoster>;
  meshLinked: number;
  activeClawId: string | null;
  config: ReturnType<typeof swarmConfigFromFre>;
  profileSource: "forge" | "mock";
  workloads: SwarmWorkloadItem[];
  xpEvents: Awaited<ReturnType<typeof listSwarmXpEvents>>;
  xpStreak: number;
  cafeBonus: Awaited<ReturnType<typeof evaluateSwarmCafeBonus>>;
  goLive: SwarmGoLiveReport;
  gamificationOptOut: boolean;
}

export async function buildSwarmDashboardBootstrap(): Promise<SwarmDashboardBootstrap> {
  const [fre, settings, profiles, workloads, xpEvents, goLive] = await Promise.all([
    readAppFreState("robotaxi-fleet-manager"),
    readUserSettings(),
    readClawProfiles(),
    listSwarmWorkloads(15),
    listSwarmXpEvents(10),
    buildSwarmGoLiveReport(),
  ]);

  const growthProfile = buildSwarmGrowthProfile(
    fre.config,
    settings.appearance.experienceLevel,
    settings.appearance.swarmGrowthLevel ?? null,
  );

  const config = swarmConfigFromFre(fre.config);
  const fleet = buildSwarmFleet(profiles.claws, fre.config);
  const forgeRoster = buildForgeRoster(profiles.claws);
  const cafeBonus = await evaluateSwarmCafeBonus();

  return {
    ok: true,
    growthProfile,
    fleet,
    forgeRoster,
    meshLinked: countMeshLinked(fleet),
    activeClawId: profiles.activeClawId,
    config,
    profileSource: profiles.claws.length > 0 ? "forge" : "mock",
    workloads,
    xpEvents,
    xpStreak: swarmXpStreak(xpEvents),
    cafeBonus,
    goLive,
    gamificationOptOut: Boolean(settings.appearance.workGamificationOptOut),
  };
}
