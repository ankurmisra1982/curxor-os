"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { growthLabel } from "@/lib/os-growth-level";

interface CafeLevelBadgeProps {
  growthLevel: GrowthLevel;
}

export function CafeLevelBadge({ growthLevel }: CafeLevelBadgeProps) {
  return (
    <span className="border border-line/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
      {growthLabel("claw-cafe", growthLevel)}
    </span>
  );
}
