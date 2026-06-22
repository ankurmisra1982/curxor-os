"use client";

import type { ExperienceLevel } from "@/lib/experience-level";

export type CapitalWorkspaceTab = "trade" | "research" | "risk" | "agents" | "analytics";

const TABS: { id: CapitalWorkspaceTab; label: string; minLevel: ExperienceLevel }[] = [
  { id: "trade", label: "Trade", minLevel: "beginner" },
  { id: "research", label: "Research", minLevel: "beginner" },
  { id: "analytics", label: "Analytics", minLevel: "standard" },
  { id: "risk", label: "Risk", minLevel: "beginner" },
  { id: "agents", label: "Agents", minLevel: "beginner" },
];

function meetsLevel(current: ExperienceLevel, required: ExperienceLevel): boolean {
  const order: ExperienceLevel[] = ["beginner", "standard", "expert"];
  return order.indexOf(current) >= order.indexOf(required);
}

interface CapitalWorkspaceTabsProps {
  active: CapitalWorkspaceTab;
  onChange: (tab: CapitalWorkspaceTab) => void;
  experienceLevel: ExperienceLevel;
}

export function CapitalWorkspaceTabs({ active, onChange, experienceLevel }: CapitalWorkspaceTabsProps) {
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

export function defaultCapitalTab(level: ExperienceLevel): CapitalWorkspaceTab {
  return level === "beginner" ? "trade" : "trade";
}

/** Maps Capital desk section ids → workspace tab. */
export const CAPITAL_SECTION_TAB: Record<string, CapitalWorkspaceTab> = {
  "recent-trades": "trade",
  "go-live": "trade",
  portfolio: "trade",
  trades: "trade",
  recovery: "trade",
  movers: "trade",
  research: "research",
  "intel-alerts": "research",
  digest: "research",
  risk: "risk",
  "auto-approval": "risk",
  brokers: "risk",
  "portfolio-health": "risk",
  pilots: "agents",
  subscriptions: "agents",
  "agent-trading": "agents",
  pfm: "agents",
  analytics: "analytics",
  scorecard: "analytics",
  "tax-lots": "analytics",
  "nl-query": "analytics",
};

export function capitalSectionVisible(sectionId: string, active: CapitalWorkspaceTab): boolean {
  return CAPITAL_SECTION_TAB[sectionId] === active;
}
