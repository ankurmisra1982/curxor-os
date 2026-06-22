"use client";

import { forgeTabLabel } from "@/lib/forge-level-copy";
import {
  defaultForgeTabForGrowth,
  forgeSectionVisibleForGrowth,
  forgeTabsForGrowth,
  type ForgeWorkspaceTab,
} from "@/lib/forge-level-gates";

export type { ForgeWorkspaceTab };

export {
  defaultForgeTabForGrowth as defaultForgeTab,
  forgeSectionVisibleForGrowth as forgeSectionVisible,
  forgeTabsForGrowth,
} from "@/lib/forge-level-gates";

const TAB_LABELS: Record<ForgeWorkspaceTab, string> = {
  mint: "Mint",
  fleet: "Fleet",
  stacks: "Stacks",
  templates: "Templates",
  import: "Import",
  ops: "Ops",
};

interface ForgeWorkspaceTabsProps {
  active: ForgeWorkspaceTab;
  onChange: (tab: ForgeWorkspaceTab) => void;
  growthLevel: import("@/lib/os-growth-level").GrowthLevel;
}

export function ForgeWorkspaceTabs({ active, onChange, growthLevel }: ForgeWorkspaceTabsProps) {
  const visible = forgeTabsForGrowth(growthLevel);

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
          {TAB_LABELS[tab] ?? forgeTabLabel(tab as "mint")}
        </button>
      ))}
    </nav>
  );
}
