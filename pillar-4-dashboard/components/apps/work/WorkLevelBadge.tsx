"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { growthLabel } from "@/lib/os-growth-level";

interface WorkLevelBadgeProps {
  growthLevel: GrowthLevel;
}

export function WorkLevelBadge({ growthLevel }: WorkLevelBadgeProps) {
  const label = growthLabel("my-work", growthLevel);
  return (
    <span className="ml-2 border border-line/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
      {label}
    </span>
  );
}
