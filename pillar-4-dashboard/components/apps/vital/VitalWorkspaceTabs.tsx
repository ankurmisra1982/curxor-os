"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import { vitalTabLabel } from "@/lib/vital-level-copy";
import {
  defaultVitalTabForGrowth,
  vitalSectionVisibleForGrowth,
  vitalTabsForGrowth,
  type VitalWorkspaceTab,
} from "@/lib/vital-level-gates";

export type { VitalWorkspaceTab };
export {
  defaultVitalTabForGrowth as defaultVitalTab,
  vitalFeatureVisible,
  vitalSectionVisibleForGrowth as vitalSectionVisible,
  vitalTabsForGrowth,
  VITAL_SECTION_TAB,
  vitalSkillVisible,
} from "@/lib/vital-level-gates";

interface VitalWorkspaceTabsProps {
  active: VitalWorkspaceTab;
  onChange: (tab: VitalWorkspaceTab) => void;
  growthLevel: GrowthLevel;
}

export function VitalWorkspaceTabs({ active, onChange, growthLevel }: VitalWorkspaceTabsProps) {
  const visible = vitalTabsForGrowth(growthLevel);

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
          {vitalTabLabel(growthLevel, tab)}
        </button>
      ))}
    </nav>
  );
}
