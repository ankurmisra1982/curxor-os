"use client";

import type { ExperienceLevel } from "@/lib/experience-level";

export type CreatorWorkspaceTab = "plan" | "create" | "publish" | "engage" | "analytics";

const TABS: { id: CreatorWorkspaceTab; label: string; minLevel: ExperienceLevel }[] = [
  { id: "plan", label: "Plan", minLevel: "beginner" },
  { id: "create", label: "Create", minLevel: "beginner" },
  { id: "publish", label: "Publish", minLevel: "beginner" },
  { id: "engage", label: "Engage", minLevel: "standard" },
  { id: "analytics", label: "Analytics", minLevel: "standard" },
];

function meetsLevel(current: ExperienceLevel, required: ExperienceLevel): boolean {
  const order: ExperienceLevel[] = ["beginner", "standard", "expert"];
  return order.indexOf(current) >= order.indexOf(required);
}

interface ContentWorkspaceTabsProps {
  active: CreatorWorkspaceTab;
  onChange: (tab: CreatorWorkspaceTab) => void;
  experienceLevel: ExperienceLevel;
}

export function ContentWorkspaceTabs({ active, onChange, experienceLevel }: ContentWorkspaceTabsProps) {
  const visible = TABS.filter((t) => meetsLevel(experienceLevel, t.minLevel));

  return (
    <nav className="flex flex-wrap gap-1 border border-line bg-panel px-2 py-2 font-mono text-[10px]">
      {visible.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1 uppercase tracking-widest ${
            active === tab.id
              ? "border border-cursor-glow text-cursor-glow"
              : "border border-transparent text-muted hover:border-line hover:text-stark"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export function defaultCreatorTab(level: ExperienceLevel): CreatorWorkspaceTab {
  return level === "beginner" ? "plan" : "create";
}

/** Maps Creator workspace section ids → tab (panels without ExperienceAppSection use virtual ids). */
export const CREATOR_SECTION_TAB: Record<string, CreatorWorkspaceTab> = {
  "go-live": "plan",
  "content-plan": "plan",
  calendar: "plan",
  playbooks: "plan",
  "creation-studio": "create",
  queue: "create",
  "draft-editor": "create",
  bridge: "publish",
  "bridge-roadmap": "publish",
  recovery: "publish",
  preflight: "publish",
  approval: "publish",
  "pinterest-board": "publish",
  "publish-receipts": "publish",
  engage: "engage",
  "reply-queue": "engage",
  "brand-studio": "analytics",
  library: "analytics",
  "ig-grid": "analytics",
  analytics: "analytics",
  attribution: "analytics",
  "team-review": "analytics",
  ops: "analytics",
  experiments: "analytics",
  "signal-feed": "analytics",
  export: "analytics",
  campaign: "analytics",
};

export function creatorSectionVisible(sectionId: string, active: CreatorWorkspaceTab): boolean {
  return CREATOR_SECTION_TAB[sectionId] === active;
}
