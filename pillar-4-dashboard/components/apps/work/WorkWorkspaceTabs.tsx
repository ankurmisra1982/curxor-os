"use client";

import type { ExperienceLevel } from "@/lib/experience-level";

export type WorkWorkspaceTab = "start" | "outreach" | "comms" | "ops" | "integrations";

const TABS: { id: WorkWorkspaceTab; label: string; minLevel: ExperienceLevel }[] = [
  { id: "start", label: "Start", minLevel: "beginner" },
  { id: "outreach", label: "Outreach", minLevel: "beginner" },
  { id: "comms", label: "Comms", minLevel: "standard" },
  { id: "ops", label: "Ops", minLevel: "standard" },
  { id: "integrations", label: "Integrations", minLevel: "expert" },
];

function meetsLevel(current: ExperienceLevel, required: ExperienceLevel): boolean {
  const order: ExperienceLevel[] = ["beginner", "standard", "expert"];
  return order.indexOf(current) >= order.indexOf(required);
}

interface WorkWorkspaceTabsProps {
  active: WorkWorkspaceTab;
  onChange: (tab: WorkWorkspaceTab) => void;
  experienceLevel: ExperienceLevel;
}

export function WorkWorkspaceTabs({ active, onChange, experienceLevel }: WorkWorkspaceTabsProps) {
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

export function defaultWorkTab(level: ExperienceLevel): WorkWorkspaceTab {
  return level === "beginner" ? "start" : "outreach";
}

export const WORK_SECTION_TAB: Record<string, WorkWorkspaceTab> = {
  "go-live": "start",
  tasks: "start",
  pipeline: "outreach",
  sequences: "outreach",
  import: "outreach",
  outbound: "outreach",
  comms: "comms",
  "sync-log": "comms",
  analytics: "ops",
  recovery: "ops",
  "send-policy": "ops",
  "day-brief": "ops",
  "connector-vault": "integrations",
  "sync-audit": "integrations",
};

export function workSectionVisible(sectionId: string, active: WorkWorkspaceTab): boolean {
  return WORK_SECTION_TAB[sectionId] === active;
}
