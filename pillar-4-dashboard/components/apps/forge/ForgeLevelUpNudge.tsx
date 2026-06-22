"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { GROWTH_LEVEL_ORDER } from "@/lib/os-growth-level";
import { forgePersonaLabel } from "@/lib/forge-level-copy";
import type { ForgeFleetCounts } from "@/lib/forge-fleet";

interface ForgeLevelUpNudgeProps {
  growthLevel: GrowthLevel;
  counts: ForgeFleetCounts;
  forgedDesks: number;
}

function nextLevel(current: GrowthLevel): GrowthLevel | null {
  const order = GROWTH_LEVEL_ORDER[current];
  if (order >= 4) return null;
  const levels: GrowthLevel[] = ["L1", "L2", "L3", "L4", "L5"];
  return levels[order + 1] ?? null;
}

export function ForgeLevelUpNudge({ growthLevel, counts, forgedDesks }: ForgeLevelUpNudgeProps) {
  const next = nextLevel(growthLevel);
  if (!next) return null;

  let reason: string | null = null;
  if (growthLevel === "L1" && counts.total >= 1) {
    reason = "You minted your first Claw — Builder mode adds the Fleet registry and Open desk links.";
  } else if (growthLevel === "L2" && forgedDesks >= 1 && counts.total >= 2) {
    reason = "Multiple claws in fleet — Smith mode unlocks stack tuning and model recommendations.";
  } else if (growthLevel === "L3" && forgedDesks >= 1) {
    reason = "You're running forged desks — Fabricator mode adds Templates and Import tabs.";
  } else if (growthLevel === "L4" && counts.total >= 3) {
    reason = "Power-user fleet — Foundry mode adds Ops governance and export hooks.";
  }

  if (!reason) return null;

  return (
    <div className="border border-amber-400/40 bg-panel px-3 py-2 font-mono text-[10px] text-amber-200">
      <span className="uppercase tracking-widest text-amber-400">Forge growth tip</span>
      <p className="mt-1 text-stark">{reason}</p>
      <p className="mt-1 text-muted">
        Update growth intent in Settings or Forge FRE to &quot;{forgePersonaLabel(next)}&quot; ({next}).
      </p>
    </div>
  );
}
