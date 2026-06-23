"use client";

import type { GrowthLevel } from "@/lib/os-growth-level";
import {
  defaultKinTabForGrowth,
  kinTabsForGrowth,
  type KinWorkspaceTab,
} from "@/lib/kin-level-gates";

export type { KinWorkspaceTab };

const TAB_LABELS: Record<KinWorkspaceTab, string> = {
  members: "Members",
  profile: "Profile",
  devices: "Devices",
  mesh: "Mesh",
  settings: "Settings",
};

interface KinWorkspaceTabsProps {
  active: KinWorkspaceTab;
  onChange: (tab: KinWorkspaceTab) => void;
  growthLevel: GrowthLevel;
}

export function KinWorkspaceTabs({ active, onChange, growthLevel }: KinWorkspaceTabsProps) {
  const visible = kinTabsForGrowth(growthLevel);

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

export function defaultKinTab(growthLevel: GrowthLevel): KinWorkspaceTab {
  return defaultKinTabForGrowth(growthLevel);
}
