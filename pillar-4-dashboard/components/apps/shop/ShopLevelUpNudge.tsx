"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { growthLabel, GROWTH_LEVELS, GROWTH_LEVEL_ORDER } from "@/lib/os-growth-level";

interface ShopLevelUpNudgeProps {
  growthLevel: GrowthLevel;
}

export function ShopLevelUpNudge({ growthLevel }: ShopLevelUpNudgeProps) {
  const idx = GROWTH_LEVEL_ORDER[growthLevel];
  if (idx >= GROWTH_LEVELS.length - 1) return null;

  const next = GROWTH_LEVELS[idx + 1]!;
  const nextLabel = growthLabel("my-shop", next);

  const hints: Record<GrowthLevel, string> = {
    L1: "Complete FRE as Side hustle to unlock demo pipeline + margin watch.",
    L2: "Operate daily fulfillment to unlock alerts, ship bin, and fulfillment tab.",
    L3: "Wholesale persona unlocks mesh bridge preview and channel spread matrix.",
    L4: "Desk lead governance ships in a future wave.",
    L5: "",
  };

  const hint = hints[growthLevel];
  if (!hint) return null;

  return (
    <div className="border border-cursor-glow/30 bg-cursor-glow/5 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-cursor-glow">
        Next · {nextLabel}
      </p>
      <p className="mt-1 font-mono text-[10px] text-muted">{hint}</p>
    </div>
  );
}
