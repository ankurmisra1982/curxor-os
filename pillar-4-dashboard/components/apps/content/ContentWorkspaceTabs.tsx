"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import {
  creatorTabsForGrowth,
  defaultCreatorTabForGrowth,
  creatorSectionVisibleForGrowth,
  type CreatorWorkspaceTab,
} from "@/lib/creator-level-gates";

export type { CreatorWorkspaceTab };

const TAB_LABELS: Record<CreatorWorkspaceTab, string> = {
  plan: "Plan",
  create: "Create",
  publish: "Publish",
  engage: "Engage",
  analytics: "Analytics",
};

interface ContentWorkspaceTabsProps {
  active: CreatorWorkspaceTab;
  onChange: (tab: CreatorWorkspaceTab) => void;
  growthLevel: GrowthLevel;
}

export function ContentWorkspaceTabs({ active, onChange, growthLevel }: ContentWorkspaceTabsProps) {
  const visible = creatorTabsForGrowth(growthLevel);

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

export function defaultCreatorTab(growthLevel: GrowthLevel): CreatorWorkspaceTab {
  return defaultCreatorTabForGrowth(growthLevel);
}

export { creatorSectionVisibleForGrowth as creatorSectionVisible } from "@/lib/creator-level-gates";
