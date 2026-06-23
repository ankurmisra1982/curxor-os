"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { growthLabel } from "@/lib/os-growth-level";

interface SwarmLevelBadgeProps {
  growthLevel: GrowthLevel;
}

export function SwarmLevelBadge({ growthLevel }: SwarmLevelBadgeProps) {
  const label = growthLabel("robotaxi-fleet-manager", growthLevel);
  return (
    <span className="border border-line/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
      {label}
    </span>
  );
}
