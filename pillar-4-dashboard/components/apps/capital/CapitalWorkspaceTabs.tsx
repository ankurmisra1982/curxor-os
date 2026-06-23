"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { capitalTabLabel } from "@/lib/capital-level-copy";
import { capitalTabsForGrowth, defaultCapitalTabForGrowth } from "@/lib/capital-level-gates";

export type { CapitalWorkspaceTab } from "@/lib/capital-level-gates";
export {
  capitalSectionVisibleForGrowth as capitalSectionVisible,
  defaultCapitalTabForGrowth as defaultCapitalTab,
  CAPITAL_SECTION_TAB,
  capitalFeatureVisible,
  capitalTabsForGrowth,
} from "@/lib/capital-level-gates";

import type { CapitalWorkspaceTab } from "@/lib/capital-level-gates";

interface CapitalWorkspaceTabsProps {
  active: CapitalWorkspaceTab;
  onChange: (tab: CapitalWorkspaceTab) => void;
  growthLevel: GrowthLevel;
}

export function CapitalWorkspaceTabs({ active, onChange, growthLevel }: CapitalWorkspaceTabsProps) {
  const visible = capitalTabsForGrowth(growthLevel);

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
          {capitalTabLabel(growthLevel, tab)}
        </button>
      ))}
    </nav>
  );
}
