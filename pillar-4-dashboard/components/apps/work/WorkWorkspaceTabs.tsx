"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import {
  defaultWorkTabForGrowth,
  workTabsForGrowth,
  type WorkWorkspaceTab,
} from "@/lib/work-level-gates";

export type { WorkWorkspaceTab };

const TAB_LABELS: Record<WorkWorkspaceTab, string> = {
  start: "Start",
  outreach: "Outreach",
  comms: "Comms",
  ops: "Ops",
  integrations: "Integrations",
};

interface WorkWorkspaceTabsProps {
  active: WorkWorkspaceTab;
  onChange: (tab: WorkWorkspaceTab) => void;
  growthLevel: GrowthLevel;
}

export function WorkWorkspaceTabs({ active, onChange, growthLevel }: WorkWorkspaceTabsProps) {
  const visible = workTabsForGrowth(growthLevel);

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

export function defaultWorkTab(growthLevel: GrowthLevel): WorkWorkspaceTab {
  return defaultWorkTabForGrowth(growthLevel);
}

export { workSectionVisibleForGrowth as workSectionVisible } from "@/lib/work-level-gates";
