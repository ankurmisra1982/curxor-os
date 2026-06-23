"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { GROWTH_LEVEL_ORDER, growthLabel } from "@/lib/os-growth-level";

interface VitalLevelUpNudgeProps {
  growthLevel: GrowthLevel;
  stats: {
    connectedBridges: number;
    reportCount: number;
    protocolSteps: number;
    meshPublished: boolean;
  };
}

function nextLevel(current: GrowthLevel): GrowthLevel | null {
  const order = GROWTH_LEVEL_ORDER[current];
  if (order >= 4) return null;
  const levels: GrowthLevel[] = ["L1", "L2", "L3", "L4", "L5"];
  return levels[order + 1] ?? null;
}

export function VitalLevelUpNudge({ growthLevel, stats }: VitalLevelUpNudgeProps) {
  const next = nextLevel(growthLevel);
  if (!next) return null;

  let reason: string | null = null;
  if (growthLevel === "L1" && stats.protocolSteps >= 3) {
    reason = "Your starter protocol is set — Tracker mode unlocks wearables and health bridges.";
  } else if (growthLevel === "L2" && stats.connectedBridges >= 1) {
    reason = "A bridge is connected — Optimizer mode adds lab reports and mesh publish.";
  } else if (growthLevel === "L3" && stats.reportCount >= 1 && stats.meshPublished) {
    reason = "Reports and mesh sync active — Athlete mode adds trend analytics.";
  } else if (growthLevel === "L4" && stats.protocolSteps >= 4) {
    reason = "Full protocol running — Longevity mode is the complete desk.";
  }

  if (!reason) return null;

  return (
    <div className="border border-amber-400/40 bg-panel px-3 py-2 font-mono text-[10px] text-amber-200">
      <span className="uppercase tracking-widest text-amber-400">Growth tip</span>
      <p className="mt-1 text-stark">{reason}</p>
      <p className="mt-1 text-muted">
        Re-run Vital FRE and choose &quot;{growthLabel("my-vital", next)}&quot; when you&apos;re ready.
      </p>
    </div>
  );
}
