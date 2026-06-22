"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { forgePersonaLabel } from "@/lib/forge-level-copy";

interface ForgeLevelBadgeProps {
  growthLevel: GrowthLevel;
}

export function ForgeLevelBadge({ growthLevel }: ForgeLevelBadgeProps) {
  return (
    <span className="border border-line/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted">
      {forgePersonaLabel(growthLevel)}
    </span>
  );
}
