"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { GROWTH_LEVEL_ORDER, growthLabel } from "@/lib/os-growth-level";

interface WorkLevelUpNudgeProps {
  growthLevel: GrowthLevel;
  stats: {
    leadsInPipeline: number;
    activeSequences: number;
    repliesThisWeek: number;
    sendsToday: number;
  };
}

function nextLevel(current: GrowthLevel): GrowthLevel | null {
  const order = GROWTH_LEVEL_ORDER[current];
  if (order >= 4) return null;
  const levels: GrowthLevel[] = ["L1", "L2", "L3", "L4", "L5"];
  return levels[order + 1] ?? null;
}

export function WorkLevelUpNudge({ growthLevel, stats }: WorkLevelUpNudgeProps) {
  const next = nextLevel(growthLevel);
  if (!next) return null;

  let reason: string | null = null;
  if (growthLevel === "L1" && stats.leadsInPipeline >= 3) {
    reason = "You're tracking several opportunities — Side Hustler mode adds follow-up sequences.";
  } else if (growthLevel === "L2" && stats.activeSequences >= 2 && stats.repliesThisWeek >= 1) {
    reason = "You're running sequences with replies — Operator mode adds approvals and campaign tools.";
  } else if (growthLevel === "L3" && stats.sendsToday >= 5 && stats.activeSequences >= 3) {
    reason = "Volume is growing — Professional mode unlocks full integrations and live send path.";
  } else if (growthLevel === "L4" && stats.leadsInPipeline >= 10) {
    reason = "Large pipeline — Executive brief and governance tools are available at L5.";
  }

  if (!reason) return null;

  return (
    <div className="border border-amber-400/40 bg-panel px-3 py-2 font-mono text-[10px] text-amber-200">
      <span className="uppercase tracking-widest text-amber-400">Growth tip</span>
      <p className="mt-1 text-stark">{reason}</p>
      <p className="mt-1 text-muted">
        Re-run setup wizard and choose &quot;{growthLabel("my-work", next)}&quot; when you&apos;re ready.
      </p>
    </div>
  );
}
