"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import {
  cafeTabsForGrowth,
  type CafeWorkspaceTab,
} from "@/lib/cafe-level-gates";

export type { CafeWorkspaceTab };

export {
  cafeTabsForGrowth,
  defaultCafeTabForGrowth as defaultCafeTab,
  cafeSectionVisibleForGrowth as cafeSectionVisible,
} from "@/lib/cafe-level-gates";

const TAB_LABELS: Record<CafeWorkspaceTab, string> = {
  play: "Play",
  ascension: "Ascension",
  progress: "Progress",
  host: "Host",
};

interface CafeWorkspaceTabsProps {
  active: CafeWorkspaceTab;
  onChange: (tab: CafeWorkspaceTab) => void;
  growthLevel: GrowthLevel;
}

export function CafeWorkspaceTabs({ active, onChange, growthLevel }: CafeWorkspaceTabsProps) {
  const visible = cafeTabsForGrowth(growthLevel);

  return (
    <nav className="flex flex-wrap gap-1 border border-line bg-panel px-2 py-2 font-mono text-[10px]">
      {visible.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`px-3 py-1 uppercase tracking-widest ${
            active === tab
              ? "border border-cursor-glow text-cursor-glow"
              : "border border-transparent text-muted hover:border-line hover:text-stark"
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
