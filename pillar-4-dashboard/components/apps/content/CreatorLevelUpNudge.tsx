"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { GROWTH_LEVEL_ORDER, growthLabel } from "@/lib/os-growth-level";

interface CreatorLevelUpNudgeProps {
  growthLevel: GrowthLevel;
  stats: {
    scheduledPosts: number;
    publishedPosts: number;
    pendingApprovals: number;
    engageSuggestions: number;
  };
}

function nextLevel(current: GrowthLevel): GrowthLevel | null {
  const order = GROWTH_LEVEL_ORDER[current];
  if (order >= 4) return null;
  const levels: GrowthLevel[] = ["L1", "L2", "L3", "L4", "L5"];
  return levels[order + 1] ?? null;
}

export function CreatorLevelUpNudge({ growthLevel, stats }: CreatorLevelUpNudgeProps) {
  const next = nextLevel(growthLevel);
  if (!next) return null;

  let reason: string | null = null;
  if (growthLevel === "L1" && stats.scheduledPosts >= 1) {
    reason = "You have posts in the queue — Maker mode unlocks publish bridges and calendar.";
  } else if (growthLevel === "L2" && stats.publishedPosts >= 2) {
    reason = "You're publishing regularly — Publisher mode adds engage loop and approvals.";
  } else if (growthLevel === "L3" && stats.engageSuggestions >= 3) {
    reason = "Comments are flowing — Brand mode adds analytics, brand studio, and attribution.";
  } else if (growthLevel === "L4" && stats.pendingApprovals >= 2) {
    reason = "Team workflows growing — Studio mode unlocks experiments and team review.";
  }

  if (!reason) return null;

  return (
    <div className="border border-amber-400/40 bg-panel px-3 py-2 font-mono text-[10px] text-amber-200">
      <span className="uppercase tracking-widest text-amber-400">Growth tip</span>
      <p className="mt-1 text-stark">{reason}</p>
      <p className="mt-1 text-muted">
        Re-run setup wizard and choose &quot;{growthLabel("my-content-creator", next)}&quot; when you&apos;re ready.
      </p>
    </div>
  );
}
